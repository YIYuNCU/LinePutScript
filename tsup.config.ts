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
  // Distribution hardening: no source maps, no comments, minified output, and
  // every `_`-prefixed member (private / protected internals) renamed to a short
  // meaningless name. Public API names never start with `_`, so they are untouched.
  sourcemap: false,
  minify: true,
  esbuildOptions(options) {
    options.mangleProps = /^_/;
    options.legalComments = 'none';
  },
});
