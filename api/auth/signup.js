// POST /api/auth/signup — cria conta com email/senha e já abre sessão.
// Corpo: { email, password, name? } → 201 { user, token }
const { getSql, isConfigured } = require('../_lib/db');
const { hashPassword } = require('../_lib/crypto');
const { createSession, serializeSessionCookie } = require('../_lib/session');
const { readJsonBody } = require('../_lib/http');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD = 8;

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
  const name = String(body?.name || '').trim().slice(0, 120);

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Informe um email válido.' });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.` });
  }

  try {
    const sql = getSql();
    const existing = await sql`select id from users where email = ${email} limit 1`;
    if (existing.length) {
      return res.status(409).json({ error: 'Este email já está cadastrado.' });
    }

    const rows = await sql`
      insert into users (email, password_hash, name)
      values (${email}, ${hashPassword(password)}, ${name})
      returning id, email, name`;
    const user = rows[0];

    await sql`
      insert into settings (user_id, user_name)
      values (${user.id}, ${name})
      on conflict (user_id) do nothing`;

    const { token, expiresAt } = await createSession(user.id);
    res.setHeader('Set-Cookie', serializeSessionCookie(token, expiresAt));
    return res.status(201).json({ user, token });
  } catch (e) {
    console.error(`[auth/signup] erro: ${e?.message || e}`);
    return res.status(500).json({ error: 'Erro ao criar a conta. Tente novamente.' });
  }
};
