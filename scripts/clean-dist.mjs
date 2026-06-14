// Remove .d.mts duplicate type declaration files after tsup build.
// tsup emits both .d.ts and .d.mts with identical content (only import
// suffixes differ). Our exports map uses .d.ts via the "types" condition,
// so .d.mts is dead weight (~20KB).

import { rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(fileURLToPath(import.meta.url), '../../dist');
let removed = 0;

for (const name of readdirSync(dist)) {
  if (name.endsWith('.d.mts')) {
    rmSync(join(dist, name));
    removed++;
  }
}

if (removed) console.log(`  (cleaned ${removed} duplicate .d.mts files)`);
