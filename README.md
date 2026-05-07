# LinePutScript

TypeScript SDK for the LinePutScript (LPS) data format — a text-based hierarchical key-value storage format.

LPS is a simple, human-readable structured data format used by the [VPet](https://github.com/LorisYounger/VPet) virtual pet simulator and other applications. It represents nested key-value pairs, typed values, multi-line text, and comments in a compact line-oriented syntax.

## Installation

```bash
npm install lineputscript
```

Requires Node.js >= 18.

## LPS Format Overview

A LinePutScript document consists of **Lines**, each containing an optional **Info** value, zero or more **Subs** (nested key-value pairs), and optional **Text** content.

```
Name#Info:||Sub1#Val1:||Sub2#Val2:||TextContent
```

- `#` separates the line name from its info value
- `:|` separates subs within a line, and precedes the text content
- Subs have the same `Name#Value` structure as lines
- Lines are separated by newlines

### Example

```
note#greeting:|sub#hello:|world
config#settings:|timeout#30:|enabled#true:|production
```

This document has two lines:
- `note` with info `greeting`, one sub (`sub` = `hello`), and text `world`
- `config` with info `settings`, two subs (`timeout` = `30`, `enabled` = `true`), and text `production`

### Escape Sequences

Characters with special meaning in LPS are escaped in storage and unescaped on display:

| Character | Stored As |
|-----------|-----------|
| `\|` | `/\|` |
| `/` | `/!` |
| `:\|` | `/stop` |
| `\t` | `/tab` |
| `\n` | `/n` |
| `\r` | `/r` |
| `#` | `/id` |
| `,` | `/com` |

Use `textReplace()` to convert display text → storage format, and `textDeReplace()` to convert storage → display format.

## Quick Start

```typescript
import { LPS, Line, Sub } from 'lineputscript';

// Parse a document
const doc = new LPS(`name#value:|subkey#subval:|extra text`);

// Read values
const line = doc.findLine('name');
console.log(line?.infoDisplay); // 'value'
console.log(line?.textDisplay); // 'extra text'
console.log(line?.find('subkey')?.infoDisplay); // 'subval'

// Typed access
doc.setLineInt('count', 42);
console.log(doc.getLineInt('count')); // 42

doc.setLineBool('flag', true);
console.log(doc.getLineBool('flag')); // true

// Modify
const vupmod = doc.findorAddLine('vupmod');
vupmod.findorAdd('author').infoDisplay = 'LorisYounger';

// Serialize back to string
const output = doc.toString();
```

## API Reference

### `Sub`

The base unit — a named value pair.

```typescript
new Sub()                           // Empty sub
new Sub('name#value')               // Parse from LPS string
new Sub('name', 'value')            // Name + info
new Sub('tags', 'a', 'b', 'c')      // Multiple infos (comma-joined, escape-aware)

// Properties
sub.name               // string
sub.info               // Raw storage-escaped info string
sub.infoDisplay        // Display-unescaped info string
sub.infoToInt          // number
sub.infoToInt64        // bigint
sub.infoToDouble       // number
sub.infoToBoolean      // boolean
sub.infos              // StringStructure (comma-separated values as key-value pairs)

// Methods
sub.getString()        // Display-unescaped string
sub.getInteger()       // Parse as int
sub.getInteger64()     // Parse as bigint
sub.getDouble()        // Parse as float
sub.getBoolean()       // Parse as bool ('true'/'t'/'1' → true)
sub.getDateTime()      // Parse as Date (.NET ticks or ISO string)
sub.getFloat()         // Parse as FInt64
sub.setString(val)     // Set from display string (auto-escapes)
sub.setInteger(val)    // Set from number
sub.setInteger64(val)  // Set from bigint
sub.setDouble(val)     // Set from number
sub.setBoolean(val)    // Set from boolean
sub.setDateTime(val)   // Set from Date (.NET ticks)
sub.setFloat(val)      // Set from FInt64
sub.getInfos()         // Get comma-separated values as string[]
sub.first()            // First comma-separated value or null
sub.last()             // Last comma-separated value or null
sub.load(lpsString)    // Parse from LPS string
sub.set(other)         // Copy from another ISub
sub.toString()         // Serialize to 'name#info:|' format
```

### `Line` (extends `Sub`)

A Sub with child subs, text content, and comments.

```typescript
new Line()                              // Empty line
new Line('name#info:||sub#val:||text')  // Parse from LPS string
new Line('name', 'info', 'text', [sub1, sub2])

// Properties (in addition to Sub)
line.text          // Raw storage-escaped text
line.textDisplay   // Display-unescaped text
line.textToInt     // number
line.textToInt64   // bigint
line.textToDouble  // number
line.comments      // String after /// marker
line.texts         // StringStructure over text content
line.subs          // ISub[] — ordered list of child subs

// Sub management
line.addSub(sub)
line.addorReplaceSub(sub)
line.addRange([sub1, sub2])
line.insertSub(index, sub)
line.remove(sub)           // boolean
line.removeByName(name)    // boolean
line.removeAll(name)
line.removeAt(index)
line.contains(sub)         // boolean
line.containsByName(name)  // boolean
line.find(name)            // ISub | null
line.find(name, info)      // ISub | null (match name + info)
line.findInfo(info)        // ISub | null (match info only)
line.findAll(name)         // ISub[]
line.findorAdd(name)       // Find existing or create new
line.search(value)         // ISub | null (substring match on name)
line.searchAll(value)      // ISub[] (substring match on name)
line.indexOf(name)         // number
line.indexsOf(name)        // number[] (all indices)

// Typed shorthands on subs (find-or-create, then get/set typed value)
line.getSubBool(name)         // boolean
line.setSubBool(name, val)
line.getSubInt(name, default?)   // number
line.setSubInt(name, val)
line.getSubInt64(name, default?) // bigint
line.setSubInt64(name, val)
line.getSubDouble(name, default?) // number
line.setSubDouble(name, val)
line.getSubString(name, default?) // string | null
line.setSubString(name, val)
line.getSubFloat(name, default?)  // FInt64
line.setSubFloat(name, val)
line.getSubDateTime(name, default?) // Date | null
line.setSubDateTime(name, val)
```

### `LineDict` (extends `Sub`)

Same interface as `Line` but backed by a `Map<string, ISub>` for unique-name fast O(1) lookup. When duplicate names are added, the last one wins.

### `LPS` / `LpsDocument`

A document containing an ordered collection of lines.

```typescript
new LPS()                        // Empty document
new LPS(lpsString)               // Parse from LPS string
new LPS([line1, line2])          // From array of lines

// Properties
doc.assemblage      // ILine[]
doc.count           // number of lines
doc.length          // Estimated serialized byte length

// Line management
doc.addLine(line)
doc.addorReplaceLine(line)
doc.addRange([line1, line2])
doc.insertLine(index, line)
doc.remove(line)             // boolean (by reference or name)
doc.removeAll(target)        // by reference or name
doc.removeAt(index)
doc.contains(line)           // boolean (line or sub)
doc.containsLine(name)       // boolean
doc.containsSub(name)        // boolean

// Querying
doc.findLine(name)           // ILine | null
doc.findLine(name, info)     // ILine | null (match name + info)
doc.findLineInfo(info)       // ILine | null
doc.findorAddLine(name)      // Find existing or create new
doc.findAllLine(name)        // ILine[]
doc.findAllLineInfo(info)    // ILine[]

// Cross-line sub search
doc.findSub(name)            // ISub | null (first match across all lines)
doc.findSub(name, info)      // ISub | null
doc.findSubInfo(info)        // ISub | null
doc.findAllSub(name)         // ISub[]

// Text search (substring match on name)
doc.searchLine(value)        // ILine | null
doc.searchAllLine(value)     // ILine[]
doc.searchSub(value)         // ISub | null
doc.searchAllSub(value)      // ISub[]

doc.indexOf(name)            // number
doc.first()                  // ILine | null
doc.last()                   // ILine | null
doc.load(lpsString)          // Parse/replace content
doc.toString()               // Serialize to LPS string

// Typed shorthands on lines (find-or-add-line, then get/set typed info)
doc.getLineBool(name)
doc.setLineBool(name, val)
doc.getLineInt(name, default?)
doc.setLineInt(name, val)
doc.getLineInt64(name, default?)
doc.setLineInt64(name, val)
doc.getLineDouble(name, default?)
doc.setLineDouble(name, val)
doc.getLineString(name, default?)
doc.setLineString(name, val)
doc.getLineFloat(name, default?)
doc.setLineFloat(name, val)
doc.getLineDateTime(name, default?)
doc.setLineDateTime(name, val)
```

#### `LpsDocument` extends `LPS` — adds cursor operations

```typescript
const doc = new LpsDocument(lpsString);

doc.readNext()       // ILine | null — reads and advances cursor
doc.read()           // ILine | null — reads without advancing
doc.append(line)     // Inserts line after current cursor position
doc.append(name, info, text, ...subs)  // Create and insert
doc.appendSub(...subs)      // Add subs to current line
doc.appendSubByName(name, info)
doc.readReset()      // Reset cursor to start
doc.readEnd()        // Move cursor past end
doc.readCanNext()    // boolean
doc.lineNode         // get/set cursor position (0-based, clamped)
```

### `StringStructure`

A dictionary view over a string encoded as `/n`-delimited `key=value` pairs, with caching.

```typescript
const ss = new StringStructure(
  (val) => { /* setter — called when cache flushes */ },
  () => /* getter — returns raw string */
);

ss.setString('key', 'value')
ss.getString('key')           // string | null
ss.getBool('key')             // boolean
ss.setBool('key', true)
ss.getInt('key', default?)    // number
ss.setInt('key', 42)
ss.getInt64('key')            // bigint
ss.getDouble('key')           // number
ss.getFloat('key')            // FInt64
ss.getDateTime('key')         // Date | null
ss.containsKey('key')         // boolean
ss.remove('key')              // boolean
ss.clear()
ss.keys, ss.values, ss.count
ss[Symbol.iterator]()         // Iterate [key, value] pairs
```

### `FInt64`

Fixed-precision 64-bit decimal using `bigint` internally (Anchor = 1e9). Provides exact decimal arithmetic without floating-point rounding errors.

```typescript
FInt64.fromInt(42)             // Integer → FInt64
FInt64.fromDouble(3.14)        // Double → FInt64
FInt64.fromLong(1000000000n)   // Raw bigint
FInt64.parse('3.14')           // Parse string

a.add(b)            // a + b
a.sub(b)            // a - b
a.mul(b)            // a * b
a.div(b)            // a / b
a.compareTo(b)      // -1, 0, or 1
a.equals(b)         // boolean
a.toDouble()        // number
a.toInt32()         // number (truncated)
a.toInt64()         // bigint (truncated)

FInt64.Zero, FInt64.One, FInt64.NaN
FInt64.MinValue, FInt64.MaxValue
FInt64.PositiveInfinity, FInt64.NegativeInfinity
```

### Utility Functions

```typescript
import { textReplace, textDeReplace, getHashCode, getHashCode32, splitLimited } from 'lineputscript';

textReplace('hello|world')    // → 'hello/!|world' (display → storage)
textDeReplace('hello/!|world') // → 'hello|world' (storage → display)
getHashCode('text')           // → bigint (SHA-512 based, 64-bit LE)
getHashCode32('text')         // → number (32-bit)
splitLimited('a:b:c', ':', 1) // → ['a', 'b:c']
```

## TypeScript

This package is written in TypeScript and ships with type declarations. All public APIs are fully typed.

## License

MIT
