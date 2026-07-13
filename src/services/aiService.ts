// aiService.ts — transcrição + extração de compromisso a partir de áudio.
//
// Provedores: Gemini (uma chamada multimodal: áudio → JSON) ou OpenAI
// (Whisper transcreve → chat extrai JSON). Sem chave configurada o app
// permanece em modo mock (ver voiceService.ts).
//
// As funções de parsing/normalização são puras e testadas em
// src/services/__tests__/aiService.test.ts.
import type { AppointmentCategory, ParsedAppointment } from '../types';
import {
  CATEGORY_LIST,
  CATEGORY_META,
  isValidCategory,
  isoToFriendly,
  toISO,
} from '../utils/appointmentUtils';
import type { RecordedAudio } from './recorderService';

export type AiProvider = 'mock' | 'gemini' | 'openai' | 'groq';

export interface VoiceExtraction {
  transcript: string;
  event: ParsedAppointment;
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const env = (key: string): string =>
  (typeof process !== 'undefined' && process.env && process.env[key]) || '';

/** Decide o provedor: explícito via env, senão auto-detecta pela chave. */
export function getProvider(): AiProvider {
  const explicit = env('EXPO_PUBLIC_AI_PROVIDER').toLowerCase();
  if (
    explicit === 'gemini' ||
    explicit === 'openai' ||
    explicit === 'groq' ||
    explicit === 'mock'
  ) {
    return explicit;
  }
  if (env('EXPO_PUBLIC_GEMINI_API_KEY')) return 'gemini';
  if (env('EXPO_PUBLIC_GROQ_API_KEY')) return 'groq';
  if (env('EXPO_PUBLIC_OPENAI_API_KEY')) return 'openai';
  return 'mock';
}

// ---------------------------------------------------------------
// Prompt e parsing (puros, testáveis)
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

const CATEGORY_OPTIONS = CATEGORY_LIST.map(
  (c) => `"${c}" (${CATEGORY_META[c].label})`,
).join(', ');

/** Prompt de extração. `now` injetável para testes determinísticos. */
export function buildExtractionPrompt(now: Date): string {
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

/** Remove cercas de markdown (```json ... ```) que os modelos às vezes adicionam. */
export function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

/** Valida "YYYY-MM-DD" (existência real da data, sem shift de timezone). */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

/** Normaliza horário para HH:MM 24h; devolve '' se irrecuperável. */
export function normalizeTime(value: string): string {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{1,2})[:h](\d{2})?/i);
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  if (hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Converte a resposta bruta do modelo em VoiceExtraction validado.
 * Lança erro com mensagem amigável quando a resposta é inaproveitável.
 */
export function parseExtractionResponse(
  raw: string,
  now: Date,
): VoiceExtraction {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new Error('Não consegui entender o áudio. Tente falar novamente.');
  }

  const str = (key: string): string =>
    typeof data[key] === 'string' ? (data[key] as string).trim() : '';

  const transcript = str('transcript');
  const title = str('title');
  if (!transcript && !title) {
    throw new Error(
      'Não identifiquei um compromisso na fala. Diga, por exemplo: "Marca consulta com o Dr. Ricardo quinta às 16h" ou "Prova de Cálculo sexta às 10h".',
    );
  }

  const dateISO = isValidISODate(str('dateISO')) ? str('dateISO') : toISO(now);
  const rawCategory = str('category').toLowerCase();
  const category: AppointmentCategory = isValidCategory(rawCategory)
    ? rawCategory
    : 'outro';

  const event: ParsedAppointment = {
    title: title || 'Novo compromisso',
    specialty: str('specialty'),
    date: isoToFriendly(dateISO),
    dateISO,
    time: normalizeTime(str('time')),
    location: str('location'),
    notes: str('notes'),
    category,
  };

  return { transcript: transcript || title, event };
}

// ---------------------------------------------------------------
// Provedores
// ---------------------------------------------------------------

async function extractWithGemini(audio: RecordedAudio): Promise<VoiceExtraction> {
  const key = env('EXPO_PUBLIC_GEMINI_API_KEY');
  const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildExtractionPrompt(new Date()) },
            { inline_data: { mime_type: audio.mimeType, data: audio.base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      response.status === 400 || response.status === 403
        ? 'Chave do Gemini inválida ou sem acesso. Verifique EXPO_PUBLIC_GEMINI_API_KEY no .env.'
        : `Falha na IA (Gemini ${response.status}). Tente novamente. ${body.slice(0, 200)}`,
    );
  }

  const json = await response.json();
  const text: string =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new Error('A IA não retornou resposta. Tente novamente.');
  }
  return parseExtractionResponse(text, new Date());
}

/** Converte base64 em Blob (para multipart do Whisper). */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

interface OpenAICompatibleConfig {
  label: string;
  baseUrl: string;
  apiKey: string;
  keyEnvName: string;
  chatModel: string;
  transcribeModel: string;
}

/** Fluxo Whisper + chat para qualquer API compatível com a da OpenAI (OpenAI, Groq...). */
async function extractWithOpenAICompatible(
  audio: RecordedAudio,
  cfg: OpenAICompatibleConfig,
): Promise<VoiceExtraction> {
  // 1) Transcrição: áudio → texto
  const ext = audio.mimeType.includes('webm') ? 'webm' : 'm4a';
  const form = new FormData();
  form.append('file', base64ToBlob(audio.base64, audio.mimeType), `audio.${ext}`);
  form.append('model', cfg.transcribeModel);
  form.append('language', 'pt');

  const trResponse = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });
  if (!trResponse.ok) {
    throw new Error(
      trResponse.status === 401
        ? `Chave da ${cfg.label} inválida. Verifique ${cfg.keyEnvName} no .env.`
        : `Falha na transcrição (${cfg.label} ${trResponse.status}). Tente novamente.`,
    );
  }
  const transcript: string = (await trResponse.json())?.text ?? '';
  if (!transcript.trim()) {
    throw new Error('Não ouvi nada no áudio. Fale mais perto do microfone.');
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
    throw new Error(
      `Falha na extração (${cfg.label} ${chatResponse.status}). Tente novamente.`,
    );
  }
  const content: string =
    (await chatResponse.json())?.choices?.[0]?.message?.content ?? '';
  const parsed = parseExtractionResponse(content, new Date());
  // A transcrição dedicada é a fonte de verdade.
  return { ...parsed, transcript };
}

function openAIConfig(): OpenAICompatibleConfig {
  return {
    label: 'OpenAI',
    baseUrl: OPENAI_BASE_URL,
    apiKey: env('EXPO_PUBLIC_OPENAI_API_KEY'),
    keyEnvName: 'EXPO_PUBLIC_OPENAI_API_KEY',
    chatModel: env('EXPO_PUBLIC_OPENAI_MODEL') || 'gpt-4o-mini',
    transcribeModel: 'whisper-1',
  };
}

function groqConfig(): OpenAICompatibleConfig {
  return {
    label: 'Groq',
    baseUrl: GROQ_BASE_URL,
    apiKey: env('EXPO_PUBLIC_GROQ_API_KEY'),
    keyEnvName: 'EXPO_PUBLIC_GROQ_API_KEY',
    // gpt-oss: modelos abertos da OpenAI hospedados na Groq.
    chatModel: env('EXPO_PUBLIC_GROQ_MODEL') || 'openai/gpt-oss-20b',
    transcribeModel: 'whisper-large-v3',
  };
}

/** Ponto de entrada: áudio gravado → compromisso estruturado. */
export async function extractAppointmentFromAudio(
  audio: RecordedAudio,
): Promise<VoiceExtraction> {
  const provider = getProvider();
  switch (provider) {
    case 'gemini':
      return extractWithGemini(audio);
    case 'openai':
      return extractWithOpenAICompatible(audio, openAIConfig());
    case 'groq':
      return extractWithOpenAICompatible(audio, groqConfig());
    default:
      throw new Error(
        'Nenhum provedor de IA configurado. Preencha EXPO_PUBLIC_GEMINI_API_KEY, EXPO_PUBLIC_GROQ_API_KEY ou EXPO_PUBLIC_OPENAI_API_KEY no .env.',
      );
  }
}
