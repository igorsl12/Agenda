// POST /api/auth/login — autentica com email/senha e abre sessão.
// Corpo: { email, password } → 200 { user, token }
const { getSql, isConfigured } = require('../_lib/db');
const { verifyPassword } = require('../_lib/crypto');
const { createSession, serializeSessionCookie } = require('../_lib/session');
const { readJsonBody } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!isConfigured()) {
    return res.status(500).json({ error: 'Banco de dados não configurado no servidor.' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Corpo da requisição inválido.' });
  }

  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe email e senha.' });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      select id, email, name, password_hash
      from users where email = ${email} limit 1`;
    const user = rows[0];

    // Mesma resposta para "email não existe" e "senha errada": não revela
    // quais emails estão cadastrados.
    if (!user || !user.password_hash) {
      // Conta só-Google cai aqui (password_hash null): mensagem específica ajuda.
      if (user && !user.password_hash) {
        return res.status(400).json({
          error: 'Esta conta usa "Entrar com Google". Use esse botão para acessar.',
        });
      }
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    const { token, expiresAt } = await createSession(user.id);
    res.setHeader('Set-Cookie', serializeSessionCookie(token, expiresAt));
    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (e) {
    console.error(`[auth/login] erro: ${e?.message || e}`);
    return res.status(500).json({ error: 'Erro ao entrar. Tente novamente.' });
  }
};
