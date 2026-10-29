// Micro benchmark. Usage: node scripts/bench.mjs [path-to-dist] [path-to-other-dist ...]
// Each dist is loaded through its index.mjs and measured with the same workload.
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const defaultDist = join(fileURLToPath(import.meta.url), '../../dist');
const dists = process.argv.length > 2 ? process.argv.slice(2).map((p) => resolve(p)) : [defaultDist];

function makeDocument(lines) {
  const out = [];
  for (let i = 0; i < lines; i++) {
    out.push(`line${i}#info ${i}:|alpha#${i}:|beta#some text/comvalue:|gamma#${i * 1.5}:|body of line ${i} with /id and /!|`);
  }
  return out.join('\n');
}

function time(fn, runs = 5) {
  fn(); // warm up
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    fn();
    best = Math.min(best, performance.now() - t);
  }
  return best;
}

const text = makeDocument(20000);
const rows = [];
for (const dist of dists) {
  const lib = await import(pathToFileURL(join(dist, 'index.mjs')).href);
  const { LPS, Sub, textReplace, textDeReplace } = lib;
  const doc = new LPS(text);
  const probe = ['line0', 'line10000', 'line19999'];
  const escaped = 'a|b/c\td\ne#f,g '.repeat(20);
  rows.push({
    dist: dist.split(/[\/]/).slice(-2).join('/'),
    'parse 20k lines (ms)': time(() => new LPS(text)).toFixed(1),
    'toString (ms)': time(() => doc.toString()).toFixed(1),
    'findLine x300 (ms)': time(() => { for (let i = 0; i < 100; i++) for (const p of probe) doc.findLine(p); }).toFixed(1),
    'typed read 20k (ms)': time(() => { for (const l of doc.assemblage) l.find('alpha').infoToInt; }).toFixed(1),
    'typed write 20k (ms)': time(() => { for (const l of doc.assemblage) l.find('alpha').infoToInt = 5; }).toFixed(1),
    'hash 20k lines (ms)': time(() => doc.getLongHashCode(), 3).toFixed(1),
    'escape x20k (ms)': time(() => { for (let i = 0; i < 20000; i++) textDeReplace(textReplace(escaped)); }).toFixed(1),
    'Sub hash x20k (ms)': time(() => { for (let i = 0; i < 20000; i++) new Sub('name' + i, 'value').getLongHashCode(); }, 3).toFixed(1),
  });
}
console.table(rows);
