// GET /api/auth/google/callback — troca o code por dados do usuário, faz
// upsert da conta, abre sessão e redireciona de volta pro app.
const { getSql, isConfigured } = require('../../_lib/db');
const { appOrigin } = require('../../_lib/http');
const { createSession, serializeSessionCookie } = require('../../_lib/session');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Lê um cookie específico da requisição. */
function readCookie(req, name) {
  const cookie = req.headers['cookie'] || '';
  for (const part of cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

/** Redireciona pro app com um parâmetro de erro amigável. */
function fail(res, origin, code) {
  res.writeHead(302, { Location: `${origin}/?auth_error=${encodeURIComponent(code)}` });
  res.end();
}

module.exports = async function handler(req, res) {
  const origin = appOrigin(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !isConfigured()) {
    return fail(res, origin, 'config');
  }

  // Vercel entrega a query em req.query; fallback via URL por segurança.
  const query = req.query || Object.fromEntries(
    new URL(req.url, origin).searchParams,
  );
  const code = query.code;
  const state = query.state;
  const savedState = readCookie(req, 'g_state');

  // Limpa o cookie de state independentemente do resultado.
  res.setHeader('Set-Cookie', ['g_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0']);

  if (!code || !state || !savedState || state !== savedState) {
    return fail(res, origin, 'state');
  }

  try {
    // 1) Troca o code por tokens.
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) {
      console.error(`[auth/google] token exchange falhou: ${tokenRes.status}`);
      return fail(res, origin, 'google');
    }
    const { access_token } = await tokenRes.json();

    // 2) Busca os dados do usuário.
    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) {
      console.error(`[auth/google] userinfo falhou: ${infoRes.status}`);
      return fail(res, origin, 'google');
    }
    const info = await infoRes.json();
    const googleId = String(info.sub || '');
    const email = String(info.email || '').trim().toLowerCase();
    const name = String(info.name || '').trim().slice(0, 120);
    if (!googleId || !email) {
      return fail(res, origin, 'google');
    }

    // 3) Upsert da conta: casa por google_id, senão por email (vincula a conta
    //    de senha existente ao Google), senão cria nova.
    const sql = getSql();
    let rows = await sql`select id, email, name from users where google_id = ${googleId} limit 1`;
    let user = rows[0];

    if (!user) {
      rows = await sql`select id, email, name from users where email = ${email} limit 1`;
      user = rows[0];
      if (user) {
        await sql`update users set google_id = ${googleId} where id = ${user.id}`;
      } else {
        rows = await sql`
          insert into users (email, name, google_id)
          values (${email}, ${name}, ${googleId})
          returning id, email, name`;
        user = rows[0];
        await sql`
          insert into settings (user_id, user_name)
          values (${user.id}, ${name})
          on conflict (user_id) do nothing`;
      }
    }

    // 4) Abre sessão e volta pro app.
    const { token, expiresAt } = await createSession(user.id);
    res.setHeader('Set-Cookie', [
      'g_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      serializeSessionCookie(token, expiresAt),
    ]);
    res.writeHead(302, { Location: `${origin}/` });
    res.end();
  } catch (e) {
    console.error(`[auth/google] erro: ${e?.message || e}`);
    return fail(res, origin, 'google');
  }
};
