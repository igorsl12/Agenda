// Gestão de sessão: tokens opacos guardados como hash no banco (revogáveis),
// entregues via cookie httpOnly (web) e também no corpo (nativo → Bearer).
const { getSql } = require('./db');
const { generateToken, hashToken } = require('./crypto');

const COOKIE_NAME = 'agenda_session';
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Cria uma sessão para o usuário e devolve o token cru + validade. */
async function createSession(userId) {
  const sql = getSql();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await sql`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}, ${hashToken(token)}, ${expiresAt.toISOString()})`;
  return { token, expiresAt };
}

/** Resolve o usuário a partir do token (ou null se inválido/expirado). */
async function getUserByToken(token) {
  if (!token) return null;
  const sql = getSql();
  const rows = await sql`
    select u.id, u.email, u.name
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now()
    limit 1`;
  return rows[0] || null;
}

/** Remove a sessão (logout). */
async function destroySession(token) {
  if (!token) return;
  const sql = getSql();
  await sql`delete from sessions where token_hash = ${hashToken(token)}`;
}

/** Extrai o token da requisição: Authorization: Bearer (nativo) ou cookie (web). */
function readTokenFromReq(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const cookie = req.headers['cookie'] || '';
  for (const part of cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === COOKIE_NAME) return part.slice(idx + 1).trim();
  }
  return null;
}

/** Cookie de sessão: httpOnly + Secure + SameSite=Lax (bom contra CSRF). */
function serializeSessionCookie(token, expiresAt) {
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
  ].join('; ');
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

module.exports = {
  COOKIE_NAME,
  createSession,
  getUserByToken,
  destroySession,
  readTokenFromReq,
  serializeSessionCookie,
  clearSessionCookie,
};
