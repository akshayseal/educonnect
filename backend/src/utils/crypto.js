const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'fallback_key_32_chars_change_me!', 'utf8').slice(0, 32);

/**
 * Encrypt a plaintext string (AES-256-GCM)
 * Returns base64-encoded: iv:authTag:ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a previously encrypted string
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;
  try {
    const [ivB64, authTagB64, ciphertext] = encryptedData.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Generate a unique anonymous handle like "Teacher_4A2F"
 */
function generateHandle(role) {
  const prefix = role.charAt(0).toUpperCase() + role.slice(1);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}_${suffix}`;
}

module.exports = { encrypt, decrypt, generateHandle };
