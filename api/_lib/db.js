// Conexão com o Postgres (Neon) para as funções serverless.
// Usa o driver HTTP serverless — sem pool de conexões, ideal para Vercel.
const { neon } = require('@neondatabase/serverless');

// Lazily: só cria o cliente quando DATABASE_URL existe. As funções checam
// isConfigured() e devolvem um 500 amigável quando o banco não está setado.
let cached = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada no ambiente do servidor.');
  }
  if (!cached) cached = neon(process.env.DATABASE_URL);
  return cached;
}

function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

module.exports = { getSql, isConfigured };
