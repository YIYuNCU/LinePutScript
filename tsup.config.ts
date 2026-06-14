import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    utils: 'src/utils/index.ts',
    types: 'src/types/index.ts',
    structure: 'src/structure/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2020',
  splitting: true,
  treeshake: true,
});
