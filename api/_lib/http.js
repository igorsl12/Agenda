// Utilidades HTTP compartilhadas pelas funções serverless.
const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1MB — payloads de auth são pequenos.

/** Lê o corpo JSON com limite de tamanho. Rejeita se exceder ou for inválido. */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const data = Buffer.concat(chunks).toString('utf8');
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', () => reject(new Error('read_error')));
  });
}

/** Origem pública do app (para montar redirect URIs do OAuth). */
function appOrigin(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['host'];
  return `${proto}://${host}`;
}

module.exports = { readJsonBody, appOrigin, MAX_BODY_BYTES };
