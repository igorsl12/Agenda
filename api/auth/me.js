// GET /api/auth/me — devolve o usuário logado (ou 401).
const { isConfigured } = require('../_lib/db');
const { getAuthUser } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!isConfigured()) {
    return res.status(500).json({ error: 'Banco de dados não configurado no servidor.' });
  }
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    return res.status(200).json({ user });
  } catch (e) {
    console.error(`[auth/me] erro: ${e?.message || e}`);
    return res.status(500).json({ error: 'Erro ao verificar a sessão.' });
  }
};
