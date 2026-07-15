// POST /api/auth/logout — encerra a sessão atual.
const { isConfigured } = require('../_lib/db');
const {
  destroySession,
  readTokenFromReq,
  clearSessionCookie,
} = require('../_lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  if (!isConfigured()) {
    return res.status(200).json({ ok: true });
  }
  try {
    await destroySession(readTokenFromReq(req));
  } catch (e) {
    console.error(`[auth/logout] erro: ${e?.message || e}`);
    // Cookie já foi limpo; do ponto de vista do cliente, o logout ocorreu.
  }
  return res.status(200).json({ ok: true });
};
