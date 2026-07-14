// server/index.mjs — proxy mínimo de IA para o app Agenda por Voz.
//
// Guarda as chaves de API server-side (GEMINI_API_KEY / GROQ_API_KEY /
// OPENAI_API_KEY — SEM prefixo EXPO_PUBLIC) para que nenhuma chave seja
// embutida no bundle do app. O app envia POST /extract com
// { base64, mimeType } e recebe { raw: string } — o texto JSON bruto do
// modelo, que o cliente valida com parseExtractionResponse.
//
// Sem dependências: apenas node:http + fetch nativo (Node 18+).
// Rodar: node index.mjs (envs via ambiente ou server/.env carregado à mão).
import http from 'node:http';
import { Buffer } from 'node:buffer';

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
/** Limite de payload (~15MB) — áudio base64 de gravações curtas cabe folgado. */
const MAX_BODY_BYTES = 15 * 1024 * 1024;

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// ---------------------------------------------------------------
// Prompt de extração
// (duplicado de src/services/aiService.ts de forma consciente: o server é
// Node puro e não compartilha o build TypeScript/Expo do app. Se alterar
// lá, espelhe aqui.)
// ---------------------------------------------------------------

const PT_WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const CATEGORY_OPTIONS = [
  '"saude" (Saúde)',
  '"faculdade" (Faculdade)',
  '"trabalho" (Trabalho)',
  '"esporte" (Esporte)',
  '"lazer" (Lazer)',
  '"financas" (Finanças)',
  '"outro" (Outro)',
].join(', ');

/** Data local em YYYY-MM-DD (sem shift de timezone). */
function toISO(now) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildExtractionPrompt(now) {
  const todayISO = toISO(now);
  const weekday = PT_WEEKDAYS[now.getDay()];
  return [
    'Você é um assistente que agenda compromissos a partir da fala do usuário (português do Brasil).',
    `Hoje é ${weekday}, ${todayISO}.`,
    'Analise a fala e devolva SOMENTE um objeto JSON válido, sem markdown, com os campos:',
    '{',
    '  "transcript": "transcrição fiel da fala",',
    '  "title": "nome do profissional ou do compromisso (ex.: Dr. Ricardo Alves, Exame de sangue, Prova de Cálculo)",',
    '  "specialty": "especialidade ou tipo (ex.: Dermatologista, Laboratório, Disciplina), ou string vazia",',
    '  "dateISO": "data do compromisso em YYYY-MM-DD (resolva termos relativos como amanhã ou quinta-feira a partir de hoje; dias da semana referem-se à PRÓXIMA ocorrência)",',
    '  "time": "horário em HH:MM de 24h (ex.: quatro da tarde = 16:00)",',
    '  "location": "local citado, ou string vazia",',
    '  "notes": "observações extras citadas, ou string vazia",',
    `  "category": "uma destas categorias que melhor descreve o compromisso: ${CATEGORY_OPTIONS}"`,
    '}',
    'Se algum campo não for citado na fala, use string vazia — nunca invente dados. A categoria é obrigatória; se não for óbvia, use "outro".',
  ].join('\n');
}

// ---------------------------------------------------------------
// Provedores (auto-detecção pela chave presente no ambiente do servidor)
// ---------------------------------------------------------------

function getServerProvider() {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

/** Erro com mensagem amigável (pt-BR) repassada ao app no campo `error`. */
class FriendlyError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function extractWithGemini(base64, mimeType) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildExtractionPrompt(new Date()) },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    throw new FriendlyError(
      `Falha na IA (Gemini ${response.status}). Tente novamente.`,
    );
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new FriendlyError('A IA não retornou resposta. Tente novamente.');
  }
  return text;
}

/** Fluxo Whisper + chat para APIs compatíveis com a da OpenAI (OpenAI, Groq). */
async function extractWithOpenAICompatible(base64, mimeType, cfg) {
  // 1) Transcrição: áudio → texto
  const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
  const form = new FormData();
  form.append(
    'file',
    new Blob([Buffer.from(base64, 'base64')], { type: mimeType }),
    `audio.${ext}`,
  );
  form.append('model', cfg.transcribeModel);
  form.append('language', 'pt');

  const trResponse = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });
  if (!trResponse.ok) {
    throw new FriendlyError(
      `Falha na transcrição (${cfg.label} ${trResponse.status}). Tente novamente.`,
    );
  }
  const transcript = (await trResponse.json())?.text ?? '';
  if (!transcript.trim()) {
    throw new FriendlyError(
      'Não ouvi nada no áudio. Fale mais perto do microfone.',
      422,
    );
  }

  // 2) Chat: texto → JSON estruturado
  const chatResponse = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildExtractionPrompt(new Date()) },
        { role: 'user', content: transcript },
      ],
    }),
  });
  if (!chatResponse.ok) {
    throw new FriendlyError(
      `Falha na extração (${cfg.label} ${chatResponse.status}). Tente novamente.`,
    );
  }
  const content =
    (await chatResponse.json())?.choices?.[0]?.message?.content ?? '';

  // A transcrição dedicada do Whisper é a fonte de verdade: injeta no JSON.
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify({ ...parsed, transcript });
  } catch {
    // Cliente valida e devolve erro amigável se o texto for inaproveitável.
    return content;
  }
}

function openAIConfig() {
  return {
    label: 'OpenAI',
    baseUrl: OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    chatModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    transcribeModel: 'whisper-1',
  };
}

function groqConfig() {
  return {
    label: 'Groq',
    baseUrl: GROQ_BASE_URL,
    apiKey: process.env.GROQ_API_KEY,
    chatModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    transcribeModel: 'whisper-large-v3',
  };
}

// ---------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------

/** Lê o corpo da requisição com limite de tamanho. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new FriendlyError('Áudio muito grande. Grave um áudio mais curto.', 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => reject(new FriendlyError('Falha ao ler a requisição.', 400)));
  });
}

/** Valida a entrada do app: base64 e mimeType de áudio presentes. */
function parseExtractRequest(rawBody) {
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new FriendlyError('Corpo da requisição não é JSON válido.', 400);
  }
  const base64 = typeof data?.base64 === 'string' ? data.base64.trim() : '';
  const mimeType = typeof data?.mimeType === 'string' ? data.mimeType.trim() : '';
  if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new FriendlyError('Campo "base64" ausente ou inválido.', 400);
  }
  if (!/^audio\/[\w.+-]+$/.test(mimeType)) {
    throw new FriendlyError('Campo "mimeType" ausente ou não é um tipo de áudio.', 400);
  }
  return { base64, mimeType };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

async function handleExtract(req, res) {
  const provider = getServerProvider();
  if (!provider) {
    sendJson(res, 503, {
      error:
        'Servidor proxy sem chave de IA configurada. Defina GEMINI_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY no ambiente do servidor.',
    });
    return;
  }

  const { base64, mimeType } = parseExtractRequest(await readBody(req));

  const raw =
    provider === 'gemini'
      ? await extractWithGemini(base64, mimeType)
      : await extractWithOpenAICompatible(
          base64,
          mimeType,
          provider === 'groq' ? groqConfig() : openAIConfig(),
        );

  sendJson(res, 200, { raw });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true, provider: getServerProvider() ?? 'nenhum' });
      return;
    }
    if (req.method === 'POST' && req.url === '/extract') {
      await handleExtract(req, res);
      return;
    }
    sendJson(res, 404, { error: 'Rota não encontrada. Use POST /extract.' });
  } catch (error) {
    const status = error instanceof FriendlyError ? error.status : 500;
    const message =
      error instanceof FriendlyError
        ? error.message
        : 'Erro interno no servidor proxy. Tente novamente.';
    // Nunca logamos chaves nem o conteúdo do áudio — só o tipo do erro.
    if (status >= 500) {
      console.error(`[proxy] erro ${status}: ${message}`);
    }
    sendJson(res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.error(
    `[proxy] ouvindo em http://localhost:${PORT} (provedor: ${getServerProvider() ?? 'nenhum — configure uma chave'})`,
  );
});
