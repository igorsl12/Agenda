// apiClient.ts — fetch base para os endpoints de auth e compromissos.
// Segue o padrão de tratamento de erro do aiService: lança Error com
// mensagem amigável vinda de { error } no corpo da resposta.
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_TOKEN_KEY = 'agenda.session_token';

/** URL base da API serverless (mesmo host do site no deploy). */
function apiBase(): string {
  // No Expo web/servidor, relativo funciona; em nativo precisa do host absoluto.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  // EXPO_PUBLIC_API_BASE permite apontar para o deploy em qualquer plataforma.
  const base = process.env.EXPO_PUBLIC_API_BASE || '';
  return base.replace(/\/+$/, '') + '/api';
}

/** Lê o token de sessão persistido (Bearer) do AsyncStorage. */
export async function getSessionToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persiste/remove o token de sessão. */
export async function setSessionToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
    else await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    /* tolerante */
  }
}

export interface ApiResult<T> {
  status: number;
  ok: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Requisição autenticada. Injeta Bearer se houver token. Em navegadores
 * (web), o cookie de sessão já é enviado automaticamente; o Bearer cobre o
 * app nativo, onde cookies não persistem entre fetch.
 */
export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, auth = false } = opts;
  const headers: Record<string, string> = {};
  let token: string | null = null;

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    token = await getSessionToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method,
      headers,
      credentials: 'include', // envia/recebe cookie de sessão no web
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return {
      status: 0,
      ok: false,
      data: null,
      error: 'Não consegui conectar ao servidor. Verifique sua conexão.',
    };
  }

  const json = (await res.json().catch(() => null)) as
    | (T & { error?: unknown })
    | null;
  const serverError =
    json && typeof (json as { error?: unknown }).error === 'string'
      ? ((json as { error: string }).error)
      : null;

  return {
    status: res.status,
    ok: res.ok,
    data: (res.ok ? (json as T) : null),
    error: res.ok ? null : serverError || `Falha (${res.status}). Tente novamente.`,
  };
}
