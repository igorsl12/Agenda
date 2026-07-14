// Testes das funções puras de parsing/normalização do aiService.
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  stripCodeFences,
  isValidISODate,
  normalizeTime,
  parseExtractionResponse,
  buildExtractionPrompt,
  getProvider,
  normalizeProxyUrl,
  parseProxyPayload,
} from '../aiService';

const NOW = new Date(2026, 6, 13); // segunda-feira, 13/07/2026

describe('stripCodeFences', () => {
  it('removes ```json fences around payload', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('removes bare ``` fences', () => {
    expect(stripCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('returns plain JSON untouched', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe('isValidISODate', () => {
  it('accepts a real date', () => {
    expect(isValidISODate('2026-07-13')).toBe(true);
  });

  it('rejects an impossible date', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
  });

  it('rejects wrong format', () => {
    expect(isValidISODate('13/07/2026')).toBe(false);
    expect(isValidISODate('')).toBe(false);
    expect(isValidISODate('amanhã')).toBe(false);
  });
});

describe('normalizeTime', () => {
  it('keeps HH:MM as-is', () => {
    expect(normalizeTime('16:00')).toBe('16:00');
  });

  it('pads single-digit hour', () => {
    expect(normalizeTime('9:30')).toBe('09:30');
  });

  it('accepts 16h and 16h30 style', () => {
    expect(normalizeTime('16h')).toBe('16:00');
    expect(normalizeTime('16h30')).toBe('16:30');
  });

  it('returns empty string for garbage or out-of-range values', () => {
    expect(normalizeTime('quatro da tarde')).toBe('');
    expect(normalizeTime('25:00')).toBe('');
    expect(normalizeTime('12:75')).toBe('');
    expect(normalizeTime('')).toBe('');
  });
});

describe('parseExtractionResponse', () => {
  const valid = JSON.stringify({
    transcript: 'Marca consulta com o Dr. Ricardo quinta às 16h',
    title: 'Dr. Ricardo',
    specialty: 'Dermatologista',
    dateISO: '2026-07-16',
    time: '16:00',
    location: 'Clínica Vida Saudável',
    notes: '',
    category: 'saude',
  });

  it('parses a valid response into a structured event', () => {
    const result = parseExtractionResponse(valid, NOW);
    expect(result.transcript).toContain('Dr. Ricardo');
    expect(result.event.title).toBe('Dr. Ricardo');
    expect(result.event.dateISO).toBe('2026-07-16');
    expect(result.event.time).toBe('16:00');
    expect(result.event.location).toBe('Clínica Vida Saudável');
    expect(result.event.date).toContain('16 de julho');
    expect(result.event.category).toBe('saude');
  });

  it('falls back to "outro" when category is missing or unknown', () => {
    const noCategory = JSON.stringify({ transcript: 'algo', title: 'Algo' });
    expect(parseExtractionResponse(noCategory, NOW).event.category).toBe('outro');

    const badCategory = JSON.stringify({
      transcript: 'algo',
      title: 'Algo',
      category: 'astrologia',
    });
    expect(parseExtractionResponse(badCategory, NOW).event.category).toBe('outro');
  });

  it('accepts a known category case-insensitively', () => {
    const raw = JSON.stringify({ transcript: 'prova', title: 'Prova', category: 'FACULDADE' });
    expect(parseExtractionResponse(raw, NOW).event.category).toBe('faculdade');
  });

  it('parses a response wrapped in markdown fences', () => {
    const result = parseExtractionResponse('```json\n' + valid + '\n```', NOW);
    expect(result.event.title).toBe('Dr. Ricardo');
  });

  it('falls back to today when dateISO is invalid', () => {
    const raw = JSON.stringify({
      transcript: 'consulta amanhã',
      title: 'Consulta',
      dateISO: 'amanhã',
      time: '10:00',
    });
    const result = parseExtractionResponse(raw, NOW);
    expect(result.event.dateISO).toBe('2026-07-13');
  });

  it('defaults missing optional fields to empty strings', () => {
    const raw = JSON.stringify({ transcript: 'só um teste', title: 'Teste' });
    const result = parseExtractionResponse(raw, NOW);
    expect(result.event.specialty).toBe('');
    expect(result.event.location).toBe('');
    expect(result.event.notes).toBe('');
    expect(result.event.time).toBe('');
  });

  it('throws a friendly error on invalid JSON', () => {
    expect(() => parseExtractionResponse('not json at all', NOW)).toThrow(
      /Não consegui entender/,
    );
  });

  it('throws when neither transcript nor title is present', () => {
    expect(() => parseExtractionResponse('{}', NOW)).toThrow(
      /Não identifiquei um compromisso/,
    );
  });

  it('uses title as transcript fallback', () => {
    const raw = JSON.stringify({ title: 'Dr. Silva' });
    const result = parseExtractionResponse(raw, NOW);
    expect(result.transcript).toBe('Dr. Silva');
  });
});

describe('buildExtractionPrompt', () => {
  it('embeds today date and weekday in pt-BR', () => {
    const prompt = buildExtractionPrompt(NOW);
    expect(prompt).toContain('2026-07-13');
    expect(prompt).toContain('segunda-feira');
    expect(prompt).toContain('dateISO');
  });

  it('lists all known categories', () => {
    const prompt = buildExtractionPrompt(NOW);
    expect(prompt).toContain('"saude"');
    expect(prompt).toContain('"faculdade"');
    expect(prompt).toContain('"outro"');
  });
});

describe('getProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a known provider value', () => {
    expect(['mock', 'gemini', 'openai', 'groq', 'proxy']).toContain(
      getProvider(),
    );
  });

  it('auto-detects proxy when EXPO_PUBLIC_AI_PROXY_URL is set', () => {
    vi.stubEnv('EXPO_PUBLIC_AI_PROVIDER', '');
    vi.stubEnv('EXPO_PUBLIC_AI_PROXY_URL', 'https://meu-proxy.exemplo.com');
    expect(getProvider()).toBe('proxy');
  });

  it('prefers proxy over direct keys in auto-detection', () => {
    vi.stubEnv('EXPO_PUBLIC_AI_PROVIDER', '');
    vi.stubEnv('EXPO_PUBLIC_AI_PROXY_URL', 'https://meu-proxy.exemplo.com');
    vi.stubEnv('EXPO_PUBLIC_GEMINI_API_KEY', 'chave-gemini');
    vi.stubEnv('EXPO_PUBLIC_GROQ_API_KEY', 'chave-groq');
    expect(getProvider()).toBe('proxy');
  });

  it('respects an explicit provider over the proxy URL', () => {
    vi.stubEnv('EXPO_PUBLIC_AI_PROVIDER', 'gemini');
    vi.stubEnv('EXPO_PUBLIC_AI_PROXY_URL', 'https://meu-proxy.exemplo.com');
    expect(getProvider()).toBe('gemini');
  });

  it('accepts proxy as explicit provider', () => {
    vi.stubEnv('EXPO_PUBLIC_AI_PROVIDER', 'proxy');
    expect(getProvider()).toBe('proxy');
  });

  it('falls back to mock when nothing is configured', () => {
    vi.stubEnv('EXPO_PUBLIC_AI_PROVIDER', '');
    vi.stubEnv('EXPO_PUBLIC_AI_PROXY_URL', '');
    vi.stubEnv('EXPO_PUBLIC_GEMINI_API_KEY', '');
    vi.stubEnv('EXPO_PUBLIC_GROQ_API_KEY', '');
    vi.stubEnv('EXPO_PUBLIC_OPENAI_API_KEY', '');
    expect(getProvider()).toBe('mock');
  });
});

describe('normalizeProxyUrl', () => {
  it('strips trailing slashes', () => {
    expect(normalizeProxyUrl('http://localhost:8787/')).toBe(
      'http://localhost:8787',
    );
    expect(normalizeProxyUrl('http://localhost:8787///')).toBe(
      'http://localhost:8787',
    );
  });

  it('trims whitespace and keeps a clean URL untouched', () => {
    expect(normalizeProxyUrl('  http://localhost:8787  ')).toBe(
      'http://localhost:8787',
    );
    expect(normalizeProxyUrl('https://proxy.exemplo.com')).toBe(
      'https://proxy.exemplo.com',
    );
  });

  it('returns empty string when unset', () => {
    expect(normalizeProxyUrl('')).toBe('');
  });
});

describe('parseProxyPayload', () => {
  it('extracts the raw model text from a valid payload', () => {
    expect(parseProxyPayload({ raw: '{"title":"Consulta"}' })).toBe(
      '{"title":"Consulta"}',
    );
  });

  it('throws a friendly error for invalid shapes', () => {
    const invalids: unknown[] = [
      null,
      undefined,
      'texto solto',
      42,
      {},
      { raw: 123 },
      { raw: '' },
      { raw: '   ' },
      { transcript: 'sem raw' },
    ];
    for (const payload of invalids) {
      expect(() => parseProxyPayload(payload)).toThrow(/servidor proxy/);
    }
  });

  it('feeds parseExtractionResponse end-to-end', () => {
    const raw = JSON.stringify({
      transcript: 'Prova de Cálculo sexta às 10h',
      title: 'Prova de Cálculo',
      dateISO: '2026-07-17',
      time: '10:00',
      category: 'faculdade',
    });
    const result = parseExtractionResponse(parseProxyPayload({ raw }), NOW);
    expect(result.event.title).toBe('Prova de Cálculo');
    expect(result.event.category).toBe('faculdade');
    expect(result.event.time).toBe('10:00');
  });
});
