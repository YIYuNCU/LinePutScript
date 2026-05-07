import crypto from 'crypto';

export function getHashCode(text: string): bigint {
  const hash = crypto.createHash('sha512');
  hash.update(text, 'utf-8');
  const buf = hash.digest();
  return buf.readBigInt64LE(0);
}

export function getHashCode32(text: string): number {
  return Number(getHashCode(text) & 0xffffffffn);
}
