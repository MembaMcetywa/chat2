import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey() {
  const b64 = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!b64) throw new Error('MESSAGE_ENCRYPTION_KEY missing');
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32)
    throw new Error('MESSAGE_ENCRYPTION_KEY must be 32 bytes (base64)');
  return key;
}

export function encryptMessage(plain: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const buf = Buffer.isBuffer(plain)
    ? plain
    : Buffer.from(
        typeof plain === 'string' ? plain : JSON.stringify(plain),
        'utf8',
      );
  const ct = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, ct };
}

export function decryptMessage(iv: Buffer, tag: Buffer, ct: Buffer) {
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  const text = pt.toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
