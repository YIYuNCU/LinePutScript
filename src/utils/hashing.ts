// Sub.GetHashCode(string) of the C# original: the first 8 bytes of the UTF-8
// SHA-512 digest, read as a little-endian signed 64-bit integer.
//
// SHA-512 is implemented synchronously with pairs of 32-bit words (no BigInt in
// the compression function, no Node/Web-Crypto dependency) so it behaves the same
// in every runtime and is much faster than a BigInt implementation.

const KH = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2, 0xca273ece, 0xd186b8c7, 0xeada7dd6, 0xf57d4f7f, 0x06f067aa, 0x0a637dc5, 0x113f9804, 0x1b710b35, 0x28db77f5, 0x32caab7b, 0x3c9ebe0a, 0x431d67c4, 0x4cc5d4be, 0x597f299c, 0x5fcb6fab, 0x6c44198c]);
const KL = new Uint32Array([0xd728ae22, 0x23ef65cd, 0xec4d3b2f, 0x8189dbbc, 0xf348b538, 0xb605d019, 0xaf194f9b, 0xda6d8118, 0xa3030242, 0x45706fbe, 0x4ee4b28c, 0xd5ffb4e2, 0xf27b896f, 0x3b1696b1, 0x25c71235, 0xcf692694, 0x9ef14ad2, 0x384f25e3, 0x8b8cd5b5, 0x77ac9c65, 0x592b0275, 0x6ea6e483, 0xbd41fbd4, 0x831153b5, 0xee66dfab, 0x2db43210, 0x98fb213f, 0xbeef0ee4, 0x3da88fc2, 0x930aa725, 0xe003826f, 0x0a0e6e70, 0x46d22ffc, 0x5c26c926, 0x5ac42aed, 0x9d95b3df, 0x8baf63de, 0x3c77b2a8, 0x47edaee6, 0x1482353b, 0x4cf10364, 0xbc423001, 0xd0f89791, 0x0654be30, 0xd6ef5218, 0x5565a910, 0x5771202a, 0x32bbd1b8, 0xb8d2d0c8, 0x5141ab53, 0xdf8eeb99, 0xe19b48a8, 0xc5c95a63, 0xe3418acb, 0x7763e373, 0xd6b2b8a3, 0x5defb2fc, 0x43172f60, 0xa1f0ab72, 0x1a6439ec, 0x23631e28, 0xde82bde9, 0xb2c67915, 0xe372532b, 0xea26619c, 0x21c0c207, 0xcde0eb1e, 0xee6ed178, 0x72176fba, 0xa2c898a6, 0xbef90dae, 0x131c471b, 0x23047d84, 0x40c72493, 0x15c9bebc, 0x9c100d4c, 0xcb3e42b6, 0xfc657e2a, 0x3ad6faec, 0x4a475817]);

const WH = new Uint32Array(80);
const WL = new Uint32Array(80);
const HH = new Uint32Array(8);
const HL = new Uint32Array(8);
let buf = new Uint8Array(512);

function bswap32(x: number): number {
  return (((x & 0xff) << 24) | ((x & 0xff00) << 8) | ((x >>> 8) & 0xff00) | (x >>> 24)) >>> 0;
}

/** Encode `text` as UTF-8 into `buf`, append the SHA-2 padding and return the padded length. */
function prepare(text: string): number {
  const need = ((text.length * 3 + 17 + 127) & ~127) + 128;
  if (buf.length < need) buf = new Uint8Array(need);
  const b = buf;
  let n = 0;
  const len = text.length;
  for (let i = 0; i < len; i++) {
    let c = text.charCodeAt(i);
    if (c < 0x80) {
      b[n++] = c;
    } else if (c < 0x800) {
      b[n++] = 0xc0 | (c >> 6);
      b[n++] = 0x80 | (c & 63);
    } else if (c >= 0xd800 && c <= 0xdfff) {
      const next = i + 1 < len ? text.charCodeAt(i + 1) : 0;
      if (c <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i++;
        b[n++] = 0xf0 | (c >> 18);
        b[n++] = 0x80 | ((c >> 12) & 63);
        b[n++] = 0x80 | ((c >> 6) & 63);
        b[n++] = 0x80 | (c & 63);
      } else {
        // lone surrogate -> U+FFFD, like Encoding.UTF8
        b[n++] = 0xef;
        b[n++] = 0xbf;
        b[n++] = 0xbd;
      }
    } else {
      b[n++] = 0xe0 | (c >> 12);
      b[n++] = 0x80 | ((c >> 6) & 63);
      b[n++] = 0x80 | (c & 63);
    }
  }
  const padded = ((n + 17 + 127) >> 7) << 7;
  b[n] = 0x80;
  b.fill(0, n + 1, padded);
  const bits = n * 8;
  const hi = Math.floor(bits / 4294967296);
  const lo = bits >>> 0;
  b[padded - 8] = hi >>> 24;
  b[padded - 7] = (hi >>> 16) & 255;
  b[padded - 6] = (hi >>> 8) & 255;
  b[padded - 5] = hi & 255;
  b[padded - 4] = lo >>> 24;
  b[padded - 3] = (lo >>> 16) & 255;
  b[padded - 2] = (lo >>> 8) & 255;
  b[padded - 1] = lo & 255;
  return padded;
}

let outHi = 0;
let outLo = 0;

/** SHA-512 of the UTF-8 bytes of `text`; leaves the first digest word in outHi/outLo. */
function sha512(text: string): void {
  const total = prepare(text);
  const b = buf;
  HH[0] = 0x6a09e667; HL[0] = 0xf3bcc908;
  HH[1] = 0xbb67ae85; HL[1] = 0x84caa73b;
  HH[2] = 0x3c6ef372; HL[2] = 0xfe94f82b;
  HH[3] = 0xa54ff53a; HL[3] = 0x5f1d36f1;
  HH[4] = 0x510e527f; HL[4] = 0xade682d1;
  HH[5] = 0x9b05688c; HL[5] = 0x2b3e6c1f;
  HH[6] = 0x1f83d9ab; HL[6] = 0xfb41bd6b;
  HH[7] = 0x5be0cd19; HL[7] = 0x137e2179;

  for (let o = 0; o < total; o += 128) {
    for (let i = 0, p = o; i < 16; i++, p += 8) {
      WH[i] = ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0;
      WL[i] = ((b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7]) >>> 0;
    }
    for (let i = 16; i < 80; i++) {
      const xh = WH[i - 15], xl = WL[i - 15];
      const s0h = ((xh >>> 1) | (xl << 31)) ^ ((xh >>> 8) | (xl << 24)) ^ (xh >>> 7);
      const s0l = ((xl >>> 1) | (xh << 31)) ^ ((xl >>> 8) | (xh << 24)) ^ ((xl >>> 7) | (xh << 25));
      const yh = WH[i - 2], yl = WL[i - 2];
      const s1h = ((yh >>> 19) | (yl << 13)) ^ ((yl >>> 29) | (yh << 3)) ^ (yh >>> 6);
      const s1l = ((yl >>> 19) | (yh << 13)) ^ ((yh >>> 29) | (yl << 3)) ^ ((yl >>> 6) | (yh << 26));
      const lo = WL[i - 16] + (s0l >>> 0) + WL[i - 7] + (s1l >>> 0);
      WL[i] = lo;
      WH[i] = WH[i - 16] + (s0h >>> 0) + WH[i - 7] + (s1h >>> 0) + Math.floor(lo / 4294967296);
    }

    let ah = HH[0], al = HL[0], bh = HH[1], bl = HL[1], ch = HH[2], cl = HL[2], dh = HH[3], dl = HL[3];
    let eh = HH[4], el = HL[4], fh = HH[5], fl = HL[5], gh = HH[6], gl = HL[6], hh = HH[7], hl = HL[7];

    for (let i = 0; i < 80; i++) {
      const S1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
      const S1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));
      const chh = (eh & fh) ^ (~eh & gh);
      const chl = (el & fl) ^ (~el & gl);
      const l1 = hl + (S1l >>> 0) + (chl >>> 0) + KL[i] + WL[i];
      const t1h = (hh + (S1h >>> 0) + (chh >>> 0) + KH[i] + WH[i] + Math.floor(l1 / 4294967296)) >>> 0;
      const t1l = l1 >>> 0;
      const S0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
      const S0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));
      const mjh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
      const mjl = (al & bl) ^ (al & cl) ^ (bl & cl);
      const l2 = (S0l >>> 0) + (mjl >>> 0);
      const t2h = ((S0h >>> 0) + (mjh >>> 0) + Math.floor(l2 / 4294967296)) >>> 0;
      const t2l = l2 >>> 0;

      hh = gh; hl = gl;
      gh = fh; gl = fl;
      fh = eh; fl = el;
      const l3 = dl + t1l;
      eh = (dh + t1h + Math.floor(l3 / 4294967296)) >>> 0;
      el = l3 >>> 0;
      dh = ch; dl = cl;
      ch = bh; cl = bl;
      bh = ah; bl = al;
      const l4 = t1l + t2l;
      ah = (t1h + t2h + Math.floor(l4 / 4294967296)) >>> 0;
      al = l4 >>> 0;
    }

    let l: number;
    l = HL[0] + al; HH[0] = HH[0] + ah + Math.floor(l / 4294967296); HL[0] = l;
    l = HL[1] + bl; HH[1] = HH[1] + bh + Math.floor(l / 4294967296); HL[1] = l;
    l = HL[2] + cl; HH[2] = HH[2] + ch + Math.floor(l / 4294967296); HL[2] = l;
    l = HL[3] + dl; HH[3] = HH[3] + dh + Math.floor(l / 4294967296); HL[3] = l;
    l = HL[4] + el; HH[4] = HH[4] + eh + Math.floor(l / 4294967296); HL[4] = l;
    l = HL[5] + fl; HH[5] = HH[5] + fh + Math.floor(l / 4294967296); HL[5] = l;
    l = HL[6] + gl; HH[6] = HH[6] + gh + Math.floor(l / 4294967296); HL[6] = l;
    l = HL[7] + hl; HH[7] = HH[7] + hh + Math.floor(l / 4294967296); HL[7] = l;
  }
  outHi = HH[0];
  outLo = HL[0];
}

/** The 64-bit hash of `text` (C# `Sub.GetHashCode(string)`). */
export function getHashCode(text: string): bigint {
  sha512(text);
  // digest bytes 0..3 are the big-endian bytes of outHi, bytes 4..7 those of outLo;
  // reading them as little-endian swaps the bytes of each word.
  return BigInt.asIntN(64, (BigInt(bswap32(outLo)) << 32n) | BigInt(bswap32(outHi)));
}

/** The low 32 bits of the 64-bit hash as a signed integer (C# `(int)GetLongHashCode()`). */
export function getHashCode32(text: string): number {
  sha512(text);
  return bswap32(outHi) | 0;
}
