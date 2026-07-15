// Helper de autorização: resolve o usuário logado a partir da requisição.
// Use no início de qualquer endpoint protegido.
const { getUserByToken, readTokenFromReq } = require('./session');

/** Devolve { id, email, name } do usuário logado, ou null. */
async function getAuthUser(req) {
  return getUserByToken(readTokenFromReq(req));
}

/**
 * Exige autenticação: devolve o usuário ou responde 401 e devolve null.
 * Padrão de uso: `const user = await requireAuth(req, res); if (!user) return;`
 */
async function requireAuth(req, res) {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Não autenticado. Faça login.' });
    return null;
  }
  return user;
}

module.exports = { getAuthUser, requireAuth };
