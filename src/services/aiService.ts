// aiService.ts — transcrição + extração de compromisso a partir de áudio.
//
// Provedores: Gemini (uma chamada multimodal: áudio → JSON) ou OpenAI
// (Whisper transcreve → chat extrai JSON). Sem chave configurada o app
// permanece em modo mock (ver voiceService.ts).
//
// As funções de parsing/normalização são puras e testadas em
// src/services/__tests__/aiService.test.ts.
import type { ParsedAppointment } from '../types';
import { isoToFriendly, toISO } from '../utils/appointmentUtils';
import type { RecordedAudio } from './recorderService';

export type AiProvider = 'mock' | 'gemini' | 'openai';

export interface VoiceExtraction {
  transcript: string;
  event: ParsedAppointment;
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

const env = (key: string): string =>
  (typeof process !== 'undefined' && process.env && process.env[key]) || '';

/** Decide o provedor: explícito via env, senão auto-detecta pela chave. */
export function getProvider(): AiProvider {
  const explicit = env('EXPO_PUBLIC_AI_PROVIDER').toLowerCase();
  if (explicit === 'gemini' || explicit === 'openai' || explicit === 'mock') {
    return explicit;
  }
  if (env('EXPO_PUBLIC_GEMINI_API_KEY')) return 'gemini';
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

/** Prompt de extração. `now` injetável para testes determinísticos. */
export function buildExtractionPrompt(now: Date): string {
  const todayISO = toISO(now);
  const weekday = PT_WEEKDAYS[now.getDay()];
  return [
    'Você é um assistente que agenda compromissos médicos a partir da fala do usuário (português do Brasil).',
    `Hoje é ${weekday}, ${todayISO}.`,
    'Analise a fala e devolva SOMENTE um objeto JSON válido, sem markdown, com os campos:',
    '{',
    '  "transcript": "transcrição fiel da fala",',
    '  "title": "nome do profissional ou do compromisso (ex.: Dr. Ricardo Alves, Exame de sangue)",',
    '  "specialty": "especialidade ou tipo (ex.: Dermatologista, Laboratório)",',
    '  "dateISO": "data do compromisso em YYYY-MM-DD (resolva termos relativos como amanhã ou quinta-feira a partir de hoje; dias da semana referem-se à PRÓXIMA ocorrência)",',
    '  "time": "horário em HH:MM de 24h (ex.: quatro da tarde = 16:00)",',
    '  "location": "local citado, ou string vazia",',
    '  "notes": "observações extras citadas, ou string vazia"',
    '}',
    'Se algum campo não for citado na fala, use string vazia — nunca invente dados.',
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
      'Não identifiquei um compromisso na fala. Diga, por exemplo: "Marca consulta com o Dr. Ricardo quinta às 16h".',
    );
  }

  const dateISO = isValidISODate(str('dateISO')) ? str('dateISO') : toISO(now);

  const event: ParsedAppointment = {
    title: title || 'Novo compromisso',
    specialty: str('specialty'),
    date: isoToFriendly(dateISO),
    dateISO,
    time: normalizeTime(str('time')),
    location: str('location'),
    notes: str('notes'),
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

async function extractWithOpenAI(audio: RecordedAudio): Promise<VoiceExtraction> {
  const key = env('EXPO_PUBLIC_OPENAI_API_KEY');
  const model = env('EXPO_PUBLIC_OPENAI_MODEL') || 'gpt-4o-mini';

  // 1) Whisper: áudio → texto
  const ext = audio.mimeType.includes('webm') ? 'webm' : 'm4a';
  const form = new FormData();
  form.append('file', base64ToBlob(audio.base64, audio.mimeType), `audio.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  const trResponse = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!trResponse.ok) {
    throw new Error(
      trResponse.status === 401
        ? 'Chave da OpenAI inválida. Verifique EXPO_PUBLIC_OPENAI_API_KEY no .env.'
        : `Falha na transcrição (OpenAI ${trResponse.status}). Tente novamente.`,
    );
  }
  const transcript: string = (await trResponse.json())?.text ?? '';
  if (!transcript.trim()) {
    throw new Error('Não ouvi nada no áudio. Fale mais perto do microfone.');
  }

  // 2) Chat: texto → JSON estruturado
  const chatResponse = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildExtractionPrompt(new Date()) },
        { role: 'user', content: transcript },
      ],
    }),
  });
  if (!chatResponse.ok) {
    throw new Error(`Falha na extração (OpenAI ${chatResponse.status}). Tente novamente.`);
  }
  const content: string =
    (await chatResponse.json())?.choices?.[0]?.message?.content ?? '';
  const parsed = parseExtractionResponse(content, new Date());
  // O Whisper é a fonte de verdade da transcrição.
  return { ...parsed, transcript };
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
      return extractWithOpenAI(audio);
    default:
      throw new Error(
        'Nenhum provedor de IA configurado. Preencha EXPO_PUBLIC_GEMINI_API_KEY ou EXPO_PUBLIC_OPENAI_API_KEY no .env.',
      );
  }
}
