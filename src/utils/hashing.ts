const MASK_64 = 0xffffffffffffffffn;
const SIGN_BIT_64 = 0x8000000000000000n;
const MOD_64 = 0x10000000000000000n;

const K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
];

function rightRotate(value: bigint, bits: number): bigint {
  const shift = BigInt(bits);
  return ((value >> shift) | (value << (64n - shift))) & MASK_64;
}

function add64(...values: bigint[]): bigint {
  let result = 0n;
  for (const value of values) result = (result + value) & MASK_64;
  return result;
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function readUint64BE(bytes: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value = (value << 8n) | BigInt(bytes[offset + i]);
  }
  return value;
}

function writeUint128BE(bytes: Uint8Array, offset: number, value: bigint): void {
  for (let i = 15; i >= 0; i--) {
    bytes[offset + i] = Number(value & 0xffn);
    value >>= 8n;
  }
}

function firstWordAsInt64LE(word: bigint): bigint {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    const byte = (word >> BigInt((7 - i) * 8)) & 0xffn;
    value |= byte << BigInt(i * 8);
  }
  return value >= SIGN_BIT_64 ? value - MOD_64 : value;
}

function sha512FirstWord(text: string): bigint {
  const input = encodeUtf8(text);
  const bitLength = BigInt(input.length) * 8n;
  const paddedLength = Math.ceil((input.length + 1 + 16) / 128) * 128;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  writeUint128BE(bytes, paddedLength - 16, bitLength);

  let h0 = 0x6a09e667f3bcc908n;
  let h1 = 0xbb67ae8584caa73bn;
  let h2 = 0x3c6ef372fe94f82bn;
  let h3 = 0xa54ff53a5f1d36f1n;
  let h4 = 0x510e527fade682d1n;
  let h5 = 0x9b05688c2b3e6c1fn;
  let h6 = 0x1f83d9abfb41bd6bn;
  let h7 = 0x5be0cd19137e2179n;

  const w = new Array<bigint>(80);
  for (let offset = 0; offset < bytes.length; offset += 128) {
    for (let i = 0; i < 16; i++) w[i] = readUint64BE(bytes, offset + i * 8);
    for (let i = 16; i < 80; i++) {
      const s0 = rightRotate(w[i - 15], 1) ^ rightRotate(w[i - 15], 8) ^ (w[i - 15] >> 7n);
      const s1 = rightRotate(w[i - 2], 19) ^ rightRotate(w[i - 2], 61) ^ (w[i - 2] >> 6n);
      w[i] = add64(w[i - 16], s0, w[i - 7], s1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 80; i++) {
      const s1 = rightRotate(e, 14) ^ rightRotate(e, 18) ^ rightRotate(e, 41);
      const ch = (e & f) ^ (~e & g);
      const temp1 = add64(h, s1, ch, K[i], w[i]);
      const s0 = rightRotate(a, 28) ^ rightRotate(a, 34) ^ rightRotate(a, 39);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = add64(s0, maj);

      h = g;
      g = f;
      f = e;
      e = add64(d, temp1);
      d = c;
      c = b;
      b = a;
      a = add64(temp1, temp2);
    }

    h0 = add64(h0, a);
    h1 = add64(h1, b);
    h2 = add64(h2, c);
    h3 = add64(h3, d);
    h4 = add64(h4, e);
    h5 = add64(h5, f);
    h6 = add64(h6, g);
    h7 = add64(h7, h);
  }

  return h0;
}

export function getHashCode(text: string): bigint {
  return firstWordAsInt64LE(sha512FirstWord(text));
}

export function getHashCode32(text: string): number {
  return Number(getHashCode(text) & 0xffffffffn);
}
