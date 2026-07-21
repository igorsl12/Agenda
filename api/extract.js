// Vercel Serverless Function — proxy de IA para a Groq.
//
// Resolve DOIS problemas do browser:
//   1) CORS: a api.groq.com bloqueia chamadas diretas do navegador. Aqui a
//      chamada parte do servidor (mesmo domínio do app quando hospedada na
//      Vercel), então não há CORS.
//   2) Segredo: a GROQ_API_KEY fica AQUI (server-side), nunca no bundle.
//
// Contrato (esperado por src/services/aiService.ts -> extractWithProxy):
//   POST { base64, mimeType }  ->  200 { raw: "<json do modelo>" }
//   Em erro: { error: "mensagem amigável" } com status != 200.
//
// O app chama EXPO_PUBLIC_AI_PROXY_URL + "/extract", então esta function deve
// responder em /api/extract.
//
// Validações e mensagens espelham server/index.mjs — se alterar lá, espelhe
// aqui (e vice-versa).

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const CHAT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
// Turbo é ~4x mais rápido que whisper-large-v3, com precisão equivalente para
// frases curtas em pt-BR. Configurável via GROQ_TRANSCRIBE_MODEL.
const TRANSCRIBE_MODEL = process.env.GROQ_TRANSCRIBE_MODEL || 'whisper-large-v3-turbo';

/** Limite de payload (~15MB) — áudio base64 de gravações curtas cabe folgado. */
const MAX_BODY_BYTES = 15 * 1024 * 1024;

// Rate limit simples por IP (por instância "quente" da function — melhor
// esforço; suficiente para frear abuso casual de quota sem infra extra).
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 10);
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

const CATEGORY_OPTIONS = [
  'saude (Saúde)',
  'faculdade (Faculdade)',
  'trabalho (Trabalho)',
  'esporte (Esporte)',
  'lazer (Lazer)',
  'financas (Finanças)',
  'outro (Outro)',
].join(', ');

// Dia da semana (0=domingo) de uma data YYYY-MM-DD, independente de timezone:
// interpreta a data ao meio-dia UTC e lê getUTCDay, evitando shift de fuso.
function weekdayOfISO(todayISO) {
  return new Date(`${todayISO}T12:00:00Z`).getUTCDay();
}

// `todayISO` (YYYY-MM-DD) é a data LOCAL do dispositivo do usuário, enviada
// pelo app. É a fonte de verdade para "hoje" — sem ela cairíamos no UTC do
// servidor (Vercel), que à noite no Brasil já virou o dia seguinte.
function buildExtractionPrompt(todayISO) {
  const wd = [
    'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'sábado',
  ][weekdayOfISO(todayISO)];
  return [
    'Você é um assistente que agenda compromissos a partir da fala do usuário (português do Brasil).',
    `Hoje é ${wd}, ${todayISO}.`,
    'Analise a fala e devolva SOMENTE um objeto JSON válido, sem markdown, com os campos:',
    '{',
    '  "transcript": "transcrição fiel da fala",',
    '  "title": "nome do profissional ou do compromisso",',
    '  "specialty": "especialidade ou tipo, ou string vazia",',
    '  "dateISO": "data em YYYY-MM-DD (resolva amanhã/quinta-feira a partir de hoje)",',
    '  "time": "horário em HH:MM de 24h",',
    '  "location": "local citado, ou string vazia",',
    '  "notes": "observações extras, ou string vazia",',
    `  "category": "uma destas categorias: ${CATEGORY_OPTIONS}"`,
    '}',
    'Se algum campo não for citado, use string vazia. Categoria é obrigatória; se não óbvia use "outro".',
  ].join('\n');
}

/** Lê o corpo com limite de tamanho — aborta a conexão se exceder. */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Áudio muito grande. Grave um áudio mais curto.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const data = Buffer.concat(chunks).toString('utf8');
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { resolve(null); }
    });
    req.on('error', () => reject(Object.assign(new Error('Falha ao ler a requisição.'), { status: 400 })));
  });
}

function audioExt(mimeType) {
  return (mimeType || '').includes('webm') ? 'webm' : 'm4a';
}

module.exports = async function handler(req, res) {
  // CORS restringível via env (na Vercel o app roda no mesmo domínio; use
  // ALLOWED_ORIGIN=https://seu-app.vercel.app para fechar previews/terceiros).
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Token');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // Autenticação opcional por segredo compartilhado: se PROXY_AUTH_TOKEN
  // estiver definida no servidor, o app precisa enviar X-Proxy-Token igual.
  const requiredToken = process.env.PROXY_AUTH_TOKEN;
  if (requiredToken && req.headers['x-proxy-token'] !== requiredToken) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'desconhecido';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Muitas requisições. Aguarde um minuto e tente novamente.' });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'GROQ_API_KEY não configurada no servidor (Vercel Environment Variables).' });
  }

  try {
    const body = await readJsonBody(req);
    if (body === null) {
      return res.status(400).json({ error: 'Corpo da requisição não é JSON válido.' });
    }
    const base64 = typeof body.base64 === 'string' ? body.base64.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
    // Data local do app (validada). Fallback para o UTC do servidor só se o app
    // (build antigo) não enviar — mantém compatibilidade sem reintroduzir o bug
    // para clientes atualizados.
    const todayISO =
      typeof body.todayISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.todayISO)
        ? body.todayISO
        : new Date().toISOString().slice(0, 10);
    if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
      return res.status(400).json({ error: 'Campo "base64" ausente ou inválido.' });
    }
    if (!/^audio\/[\w.+-]+$/.test(mimeType)) {
      return res.status(400).json({ error: 'Campo "mimeType" ausente ou não é um tipo de áudio.' });
    }

    // 1) Transcrição (Whisper)
    const fd = new FormData();
    fd.append(
      'file',
      new Blob([Buffer.from(base64, 'base64')], { type: mimeType }),
      `audio.${audioExt(mimeType)}`,
    );
    fd.append('model', TRANSCRIBE_MODEL);
    fd.append('language', 'pt');

    const trRes = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!trRes.ok) {
      // Detalhe do upstream só no log do servidor — nunca no corpo da resposta.
      console.error(`[proxy] transcrição Groq falhou: ${trRes.status}`);
      return res.status(502).json({ error: `Falha na transcrição (Groq ${trRes.status}). Tente novamente.` });
    }
    const transcript = (await trRes.json()).text || '';
    if (!transcript.trim()) {
      return res.status(422).json({ error: 'Não ouvi nada no áudio. Fale mais perto do microfone.' });
    }

    // 2) Extração (chat -> JSON estruturado)
    const chatRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildExtractionPrompt(todayISO) },
          { role: 'user', content: transcript },
        ],
      }),
    });
    if (!chatRes.ok) {
      console.error(`[proxy] extração Groq falhou: ${chatRes.status}`);
      return res.status(502).json({ error: `Falha na extração (Groq ${chatRes.status}). Tente novamente.` });
    }
    const content = (await chatRes.json())?.choices?.[0]?.message?.content || '';
    if (!content.trim()) {
      return res.status(422).json({ error: 'A IA não retornou resposta. Tente novamente.' });
    }

    return res.status(200).json({ raw: content });
  } catch (e) {
    const status = typeof e?.status === 'number' ? e.status : 500;
    // Mensagem interna só no log — resposta sempre genérica/amigável.
    console.error(`[proxy] erro ${status}: ${e?.message || e}`);
    return res.status(status).json({
      error: status === 413 || status === 400
        ? e.message
        : 'Erro no servidor proxy. Tente novamente.',
    });
  }
};
