// Conexão com o Postgres (Neon) para as funções serverless.
// Usa o driver HTTP serverless — sem pool de conexões, ideal para Vercel.
const { neon } = require('@neondatabase/serverless');

// A integração Neon/Storage da Vercel injeta a connection string sob nomes
// variados conforme a versão (DATABASE_URL, POSTGRES_URL, DATABASE_URL_UNPOOLED
// etc.). Aceitamos os mais comuns para não quebrar por um simples mismatch de
// nome. Preferimos a string "pooled" quando disponível.
const CONNECTION_ENV_VARS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
];

function connectionString() {
  for (const name of CONNECTION_ENV_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return null;
}

// Lazily: só cria o cliente quando a connection string existe. As funções
// checam isConfigured() e devolvem um 500 amigável quando o banco não está setado.
let cached = null;

function getSql() {
  const url = connectionString();
  if (!url) {
    throw new Error(
      'Connection string do Postgres não configurada no ambiente do servidor ' +
        `(esperada em uma de: ${CONNECTION_ENV_VARS.join(', ')}).`,
    );
  }
  if (!cached) cached = neon(url);
  return cached;
}

function isConfigured() {
  return Boolean(connectionString());
}

module.exports = { getSql, isConfigured };
