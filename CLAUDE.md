# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

- **Build**: `npm run build` (tsup ESM+CJS+dts)
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
    hashing.ts              — FNV-1a 64-bit/32-bit hash
    fint64.ts               — FInt64 fixed-precision decimal class
    parsing.ts              — splitLimited helper
  types/
    interfaces.ts           — ISetObject, ISub, ILine, ILpsDocument
  core/
    sub.ts                  — Sub (name + info, typed accessors)
    line.ts                 — Line extends Sub (subs[], text, comments)
    line-dict.ts            — LineDict (Map-backed unique-name subs)
    lps.ts                  — LPS document (lines collection)
    lps-document.ts         — LpsDocument extends LPS (cursor ops)
  structure/
    string-structure.ts     — /n-delimited key=value dictionary
tests/
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
- **Parsing order**: Normalize CRLF → LF, replace multiline markers (`:\n|`→`\n`, `:\n:`→`""`), split by `\n`, then parse each line. Line parsing: split by `///` for comments → split by `:|` for segments → first segment splits by `#` for name/info → middle segments are Subs → last segment is text.

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
