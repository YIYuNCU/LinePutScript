# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

- **Build**: `npm run build` (tsup ESM+CJS+dts, minified, `_`-prefixed members mangled, no source maps)
- **Smoke test of dist**: `npm run smoke` (loads the built ESM and CJS bundles)
- **Benchmark**: `npm run bench [dist ...]` (compare dist folders)
- **Test (all)**: `npm test` (vitest run)
- **Test (single file)**: `npx vitest run tests/sub.test.ts`
- **Test (watch)**: `npm run test:watch`
- **Type check**: `npm run lint` (tsc --noEmit)

## Project Structure

```
src/
  index.ts                  — Re-exports all public API
  utils/
    escaping.ts             — textReplace/textDeReplace (display↔storage)
    hashing.ts              — SHA-512 (32-bit word pairs); first 8 bytes LE = C# Sub.GetHashCode
    fint64.ts               — FInt64 fixed-precision decimal class
    numeric.ts              — .NET compatible parse/format/ticks helpers (internal)
    parsing.ts              — splitLimited helper
  types/
    interfaces.ts           — ISetObject, ISub, ILine, ILpsDocument
  core/
    sub.ts                  — Sub (name + info, lazily typed via SetObject)
    line-base.ts            — LineBase: text/comments/parse/toString/hash/typed getSub*, shared by Line and LineDict
    line.ts                 — Line (ordered subs array)
    line-dict.ts            — LineDict (Map-backed unique-name subs, Line_D)
    lps.ts                  — LPS document (ordered lines)
    lps-dict.ts             — LpsDict (name-keyed lines, LPS_D; the key#value localization format)
    lps-document.ts         — LpsDocument extends LPS (cursor ops)
  structure/
    string-structure.ts     — /n-delimited key=value dictionary
    set-object.ts           — SetObject typed value container (string/int/long/double/FInt64/bool/DateTime)
tests/
  fidelity.test.ts          — C# behaviour checks (escaping equivalence, typed values, LpsDict, ...)
  escaping.test.ts
  sub.test.ts
  line.test.ts
  lps-document.test.ts
  fint64.test.ts
  string-structure.test.ts
  integration.test.ts       — Real VPet info.lps integration tests
```

## Architecture

### Three-Tier Model

```
Sub  ─── ISub  ─── ISetObject       # Name + typed info value
Line ─── ILine ─── ISub              # Sub + subs[] + text + comments
LPS  ─── ILpsDocument               # Collection of Lines
```

- **`Sub`** — Base unit with `name` (string) and `info` (storage-escaped string). Typed accessors (`getInteger`, `getDouble`, `getBoolean`, `getDateTime`, `getFloat`). `getInfos()` splits info by comma. `infoDisplay` getter auto-de-escapes for display.
- **`Line` extends `Sub`** — Adds `subs: ISub[]` (ordered array), `text`, `comments`. Sub management (`addSub`, `find`, `findorAdd`, `search`, `remove`). Typed shorthands (`getSubInt`, `setSubBool`, etc.) on child subs.
- **`LineDict` extends `Sub`** — Same API as `Line` but `Map`-backed for unique-name fast lookup. Duplicate names overwrite.
- **`LPS`** — Document with `assemblage: ILine[]`. Line management (`findLine`, `findorAddLine`, `addLine`, `remove`). Cross-line sub search (`findSub`, `findAllSub`). Typed shorthands on lines (`getLineInt`, `setLineBool`, etc.).
- **`LpsDocument` extends `LPS`** — Cursor operations (`readNext`, `append`, `readReset`, `lineNode`).

### Key Design Decisions

- **Method naming**: TypeScript doesn't support C#-style method overloading with different return types. Typed shorthand methods use distinct names: `getSubInt`/`setSubInt` on Line (not `getInteger`/`setInteger` from ISetObject), `getLineInt`/`setLineInt` on LPS. This avoids TS2416 interface conflicts.
- **Escape order**: `textReplace` must replace `|` before `/`, otherwise already-escaped sequences get corrupted. `textDeReplace` restores in reverse: `/!` → `/` before `/|` → `|`. The sequence `:|` cannot survive as a unit — `|` gets replaced first so `:|` becomes `:/!|`.
- **Sub round-trip**: `Sub.toString()` produces `name#info:|` with `:|` suffix. This is by design — `:|` is a Line-level separator consumed during Line parsing. Sub is always a segment within a Line.
- **Line vs LineDict**: Use `Line` for ordered subs (list-style data), `LineDict` for unique-key subs (dictionary-style). `LineDict.subs` getter returns `Array.from(this._subs.values())` — the returned array is a snapshot, not a live view.
- **Parsing order**: Strip BOM and `\r`, replace multiline markers (`:\n|`→`/n`, `:\n:`→`""`), split by `\n` (only empty lines are skipped), then parse each line. Line parsing: cut at the first `///` for comments → split by `:|` for segments → first segment splits by `#` for name/info → middle segments are Subs → last segment is text.
- **Escaping** is implemented as single-pass loops equal to the chained `String.Replace` calls of C# (a randomized equivalence test in `tests/fidelity.test.ts` guards this).
- **Hashing**: `getHashCode` is the first 8 bytes of SHA-512 as a little-endian signed int64, like C# `Sub.GetHashCode(string)`. Sums (`getLongHashCode`) wrap to int64; `getHashCode32` / `Sub.getHashCode()` are the signed low 32 bits.
- **Typed values**: a `Sub` stores the escaped string it was read from. The first typed write (`setInteger`, `infoToDouble = x`, ...) moves the value into a `SetObject`, which keeps the kind (so typed reads need no parsing) and converts like the C# `SetObject`. `info` is always the store string (DateTime = ticks, FInt64 = raw long, bool = `True`/`False`); `infoDisplay` is the de-escaped display string.
- **Dates** are .NET DateTimes: the wall-clock value is carried in a JS `Date` as UTC. Missing values give `DateTime.MinValue` (year 1), never `null`.
- **`_`-prefixed members** are internal. The published build renames them (esbuild `mangleProps: /^_/`), so subclasses outside this package must not rely on them.
- **Dictionary variants** (`LineDict`, `LpsDict`) match by *display* text when searching by info (as `Line_D` / `LPS_D`), `contains` is by name, and adding an existing name replaces it.

## C# to TypeScript Adaptations

| C# | TypeScript |
|---|---|
| Indexer `this[string]` | `.get(key)` / `.find(key)` methods |
| `long` / `int` | `number` / `bigint` |
| Method overloading | Optional/union parameters, distinct method names |
| `StringBuilder` | `string[]` + `.join('')` |
| `IEnumerable` | `[Symbol.iterator]()` |
| Generic `Line<T>` | `Line` (Array) + `LineDict` (Map) |
| `[Line]` attribute | Not ported — use manual mapping |
| `LPSConvert` | Not ported — use manual serialization |
