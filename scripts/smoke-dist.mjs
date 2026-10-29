// Smoke test of the BUILT package (dist): loads the ESM and the CJS entry, checks that
// they behave identically and that internal `_` members were renamed in the output.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(fileURLToPath(import.meta.url), '../../dist');
const require = createRequire(import.meta.url);

const esm = await import(pathToFileURL(join(dist, 'index.mjs')).href);
const cjs = require(join(dist, 'index.js'));

for (const [label, lib] of [['esm', esm], ['cjs', cjs]]) {
  const { LPS, Line, LineDict, LpsDict, Sub, FInt64, SetObject, getHashCode } = lib;

  // round trip
  const src = 'name#info:|a#1:|b#2:|text///note\nplain#x:|';
  assert.equal(new LPS(src).toString(), src, `${label}: round trip`);

  // typed values
  const sub = new Sub('n', '');
  sub.infoToInt = 7;
  assert.equal(sub.info, '7');
  assert.equal(sub.infoToDouble, 7);
  sub.setDateTime(new Date(Date.UTC(2024, 0, 2, 3, 4, 5)));
  assert.equal(sub.infoDisplay, '2024-01-02 03:04:05');

  // hash equals the C# definition (first 8 bytes of SHA-512, little endian, signed)
  for (const text of ['', 'abc', '中文😄', 'x'.repeat(300)]) {
    const expected = createHash('sha512').update(text, 'utf8').digest().readBigInt64LE(0);
    assert.equal(getHashCode(text), expected, `${label}: hash of ${text.slice(0, 8)}`);
  }

  // dictionary types
  const dict = new LpsDict('hello#你好:|\nbye#再见:|');
  assert.equal(dict.getLineString('hello'), '你好');
  assert.equal(new LineDict('l#i:|a#1:|').find('a').info, '1');
  assert.equal(new Line('l', 'i', [new Sub('a', '1')]).count, 1);
  assert.equal(FInt64.parse('1.5').toDouble(), 1.5);
  assert.equal(new SetObject('5').getInteger(), 5);
  console.log(`ok  ${label}`);
}

// internals must not survive minification / property mangling
let leaked = 0;
for (const name of readdirSync(dist)) {
  if (!/\.(mjs|js)$/.test(name)) continue;
  const code = readFileSync(join(dist, name), 'utf8');
  for (const word of ['_info', '_obj', '_subs', '_lines', '_text', '_cache', '_setRaw']) {
    if (code.includes(word)) {
      console.error(`leaked ${word} in ${name}`);
      leaked++;
    }
  }
  assert.ok(!code.includes('//# sourceMappingURL'), `${name}: no source map reference`);
}
assert.equal(leaked, 0, 'internal names are mangled');
console.log('ok  mangling');
