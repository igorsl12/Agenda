// Hash de senha e tokens — usando só node:crypto (sem dependências nativas).
//
// Senha: scrypt (KDF memory-hard, embutido no Node) com salt aleatório por
// usuário e comparação em tempo constante. Não inventamos primitiva de cripto:
// usamos o scrypt do Node corretamente.
const crypto = require('node:crypto');

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384; // custo (~16MB de memória; ~50-100ms por hash)

/** Gera "scrypt$N$saltHex$hashHex". */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Verifica a senha contra o hash armazenado, em tempo constante. */
function verifyPassword(password, stored) {
  try {
    const [scheme, nStr, saltHex, hashHex] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(password, salt, expected.length, {
      N: Number(nStr),
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Token de sessão/estado aleatório (256 bits, url-safe). */
function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/** Hash sha256 do token — é isso que guardamos no banco, nunca o token cru. */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { hashPassword, verifyPassword, generateToken, hashToken };
