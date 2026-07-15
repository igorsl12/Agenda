// authService.ts — camada de autenticação do cliente.
// Wrap dos endpoints /api/auth/*. Persiste o token de sessão (Bearer) no
// AsyncStorage para o app nativo; no web o cookie httpOnly também atua.
import { apiFetch, setSessionToken, getSessionToken } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

/** Cadastro email/senha → sessão. Lança em caso de falha. */
export async function signup(
  email: string,
  password: string,
  name?: string,
): Promise<AuthUser> {
  const r = await apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: { email, password, name },
  });
  if (!r.ok || !r.data) throw new Error(r.error || 'Falha ao criar conta.');
  await setSessionToken(r.data.token);
  return r.data.user;
}

/** Login email/senha → sessão. Lança em caso de falha. */
export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const r = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!r.ok || !r.data) throw new Error(r.error || 'Falha ao entrar.');
  await setSessionToken(r.data.token);
  return r.data.user;
}

/** Encerra a sessão (limpa token local + cookie no servidor). */
export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST', auth: true });
  await setSessionToken(null);
}

/** Devolve o usuário logado, ou null se não houver sessão válida. */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const r = await apiFetch<{ user: AuthUser }>('/auth/me', { auth: true });
  if (!r.ok || !r.data) return null;
  return r.data.user;
}
