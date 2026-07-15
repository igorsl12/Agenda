// GET /api/auth/google/start — redireciona para o consentimento do Google.
// Guarda um "state" (CSRF) em cookie httpOnly, validado no callback.
const crypto = require('node:crypto');
const { appOrigin } = require('../../_lib/http');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

module.exports = async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Login com Google não configurado no servidor.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${appOrigin(req)}/api/auth/google/callback`;

  // Cookie de state: curto, httpOnly, SameSite=Lax (sobrevive ao redirect de volta).
  res.setHeader('Set-Cookie', [
    `g_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  ]);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  res.writeHead(302, { Location: `${GOOGLE_AUTH_URL}?${params.toString()}` });
  res.end();
};
