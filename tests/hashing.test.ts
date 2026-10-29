import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { getHashCode, getHashCode32 } from '../src/utils/hashing';

function expectedHashCode(text: string): bigint {
  return createHash('sha512').update(text, 'utf-8').digest().readBigInt64LE(0);
}

describe('hashing', () => {
  it.each(['', 'text', 'LinePutScript', '中文', 'emoji 😄', '\ud800 lone', 'lone \udc00', 'a'.repeat(111), 'a'.repeat(112), 'a'.repeat(127), 'a'.repeat(128), 'a'.repeat(129)])(
    'matches Node SHA-512 for %j',
    (text) => {
      expect(getHashCode(text)).toBe(expectedHashCode(text));
    },
  );

  it('matches Node SHA-512 for random strings of many lengths', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let n = 0; n < 400; n++) {
      let s = '';
      const len = Math.floor(rnd() * 600);
      for (let i = 0; i < len; i++) s += String.fromCharCode(Math.floor(rnd() * (rnd() < 0.7 ? 128 : 0xd7ff)));
      expect(getHashCode(s)).toBe(expectedHashCode(s));
    }
  });

  it('getHashCode32 is the low 32 bits as a signed int, like (int)GetLongHashCode()', () => {
    for (const text of ['text', '', 'LinePutScript', '中文']) {
      expect(getHashCode32(text)).toBe(Number(BigInt.asIntN(32, expectedHashCode(text))));
    }
  });
});
