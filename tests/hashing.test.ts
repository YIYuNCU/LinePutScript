import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { getHashCode, getHashCode32 } from '../src/utils/hashing';

function expectedHashCode(text: string): bigint {
  return createHash('sha512').update(text, 'utf-8').digest().readBigInt64LE(0);
}

describe('hashing', () => {
  it.each(['', 'text', 'LinePutScript', '中文', 'emoji 😄'])('matches Node SHA-512 for %j', (text) => {
    expect(getHashCode(text)).toBe(expectedHashCode(text));
  });

  it('returns the low 32 bits of the 64-bit hash', () => {
    const hash = expectedHashCode('text');
    expect(getHashCode32('text')).toBe(Number(hash & 0xffffffffn));
  });
});
