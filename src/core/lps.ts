import { ISub, ILine, ILpsDocument } from '../types/interfaces';
import { Line } from './line';
import { LineBase } from './line-base';
import { FInt64 } from '../utils/fint64';
import { minDate, wrapInt64 } from '../utils/numeric';

/**
 * Split LPS file text into its non-empty lines and pass each to `onLine`.
 * Mirrors `LPS.Load`: "\r" is dropped, ":\n|" becomes "/n" and ":\n:" is removed
 * (both are line continuations); only truly empty lines are skipped.
 */
export function forEachLpsLine(text: string, onLine: (line: string) => void): void {
  let s = text;
  if (s.charCodeAt(0) === 0xfeff) s = s.substring(1); // byte order mark
  if (s.indexOf('\r') !== -1) s = s.replace(/\r/g, '');
  if (s.indexOf(':\n') !== -1) s = s.replace(/:\n\|/g, '/n').replace(/:\n:/g, '');
  const len = s.length;
  let pos = 0;
  while (pos < len) {
    let end = s.indexOf('\n', pos);
    if (end === -1) end = len;
    if (end > pos) onLine(s.substring(pos, end));
    pos = end + 1;
  }
}

/** The always- serialisation of any line implementation. */
export function lpsString(line: ILine): string {
  const parts: string[] = [];
  line.toString(parts);
  return parts[1];
}

/** An ordered LPS document: a list of lines in file order. */
export class LPS implements ILpsDocument {
  public assemblage: ILine[];

  constructor();
  constructor(lps: string);
  constructor(line: ILine, ...lines: ILine[]);
  constructor(lines: ILine[]);
  constructor(lpsOrLine?: string | ILine | ILine[], ...moreLines: ILine[]) {
    this.assemblage = [];
    if (lpsOrLine === undefined) return;
    if (typeof lpsOrLine === 'string') { this.load(lpsOrLine); }
    else if (Array.isArray(lpsOrLine)) { this.addRange(lpsOrLine); }
    else { this.addLine(lpsOrLine); this.addRange(moreLines); }
  }

  load(lps: string): void;
  load(lines: ILine[]): void;
  load(lpsOrLines: string | ILine[]): void {
    if (typeof lpsOrLines === 'string') {
      const lines: ILine[] = [];
      forEachLpsLine(lpsOrLines, (str) => lines.push(new Line(str)));
      this.assemblage = lines;
    } else {
      this.assemblage = [];
      this.addRange(lpsOrLines);
    }
  }

  clear(): void { this.assemblage = []; }

  addLine(newLine: ILine): void { this.assemblage.push(newLine); }

  addorReplaceLine(newLine: ILine): void {
    const old = this.findLine(newLine.name);
    if (old) old.load(newLine);
    else this.assemblage.push(newLine);
  }

  addRange(newLines: ILine[]): void { for (const line of newLines) this.assemblage.push(line); }

  insertLine(index: number, newLine: ILine): void { this.assemblage.splice(index, 0, newLine); }
  insertRange(index: number, newLines: ILine[]): void { this.assemblage.splice(index, 0, ...newLines); }

  remove(target: ILine | string): boolean {
    const a = this.assemblage;
    if (typeof target === 'string') {
      for (let i = 0; i < a.length; i++) {
        if (a[i].name === target) { a.splice(i, 1); return true; }
      }
      return false;
    }
    const idx = a.indexOf(target);
    if (idx === -1) return false;
    a.splice(idx, 1);
    return true;
  }

  removeAll(target: ILine | string): void {
    const a = this.assemblage;
    let w = 0;
    if (typeof target === 'string') {
      for (let r = 0; r < a.length; r++) if (a[r].name !== target) a[w++] = a[r];
    } else {
      for (let r = 0; r < a.length; r++) if (a[r] !== target) a[w++] = a[r];
    }
    a.length = w;
  }

  removeAt(index: number): void { this.assemblage.splice(index, 1); }

  contains(target: ILine | ISub): boolean {
    if ('subs' in target) return this.assemblage.includes(target as ILine);
    return this.assemblage.some(line => line.contains(target as ISub));
  }

  containsLine(value: string): boolean { return this.findLine(value) !== null; }
  containsSub(value: string): boolean { return this.assemblage.some(line => line.contains(value)); }

  findLine(lineName: string): ILine | null;
  findLine(lineName: string, lineinfo: string): ILine | null;
  findLine(lineName: string, lineinfo?: string): ILine | null {
    const a = this.assemblage;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (x.name === lineName && (lineinfo === undefined || x.info === lineinfo)) return x;
    }
    return null;
  }

  findLineInfo(lineinfo: string): ILine | null {
    return this.assemblage.find(x => x.info === lineinfo) ?? null;
  }

  findorAddLine(lineName: string): ILine {
    const existing = this.findLine(lineName);
    if (existing) return existing;
    const line = new Line();
    line.name = lineName;
    this.assemblage.push(line);
    return line;
  }

  /** Find the line or add an empty one (the C# indexer getter). */
  get(lineName: string): ILine { return this.findorAddLine(lineName); }

  findAllLine(lineName: string): ILine[];
  findAllLine(lineName: string, lineinfo: string): ILine[];
  findAllLine(lineName: string, lineinfo?: string): ILine[] {
    if (lineinfo === undefined) return this.assemblage.filter(x => x.name === lineName);
    return this.assemblage.filter(x => x.name === lineName && x.info === lineinfo);
  }

  findAllLineInfo(lineinfo: string): ILine[] {
    return this.assemblage.filter(x => x.info === lineinfo);
  }

  findSub(subName: string): ISub | null;
  findSub(subName: string, subinfo: string): ISub | null;
  findSub(subName: string, subinfo?: string): ISub | null {
    for (const line of this.assemblage) {
      const r = subinfo !== undefined ? line.find(subName, subinfo) : line.find(subName);
      if (r) return r;
    }
    return null;
  }

  findSubInfo(subinfo: string): ISub | null {
    for (const line of this.assemblage) { const r = line.findInfo(subinfo); if (r) return r; }
    return null;
  }

  findAllSub(subName: string): ISub[];
  findAllSub(subName: string, subinfo: string): ISub[];
  findAllSub(subName: string, subinfo?: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this.assemblage) {
      const found = subinfo !== undefined ? line.findAll(subName, subinfo) : line.findAll(subName);
      for (const s of found) results.push(s);
    }
    return results;
  }

  findAllSubInfo(subinfo: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this.assemblage) for (const s of line.findAllInfo(subinfo)) results.push(s);
    return results;
  }

  searchAllLine(value: string): ILine[] { return this.assemblage.filter(x => x.name.includes(value)); }
  searchLine(value: string): ILine | null { return this.assemblage.find(x => x.name.includes(value)) ?? null; }

  searchAllSub(value: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this.assemblage) for (const s of line.searchAll(value)) results.push(s);
    return results;
  }

  searchSub(value: string): ISub | null {
    for (const line of this.assemblage) { const r = line.search(value); if (r) return r; }
    return null;
  }

  indexOf(lineName: string): number { return this.assemblage.findIndex(x => x.name === lineName); }

  indexsOf(lineName: string): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.assemblage.length; i++)
      if (this.assemblage[i].name === lineName) indices.push(i);
    return indices;
  }

  first(): ILine | null { return this.assemblage.length > 0 ? this.assemblage[0] : null; }
  last(): ILine | null { return this.assemblage.length > 0 ? this.assemblage[this.assemblage.length - 1] : null; }

  toList(): ILine[] { return this.assemblage.slice(); }

  [Symbol.iterator](): Iterator<ILine> { return this.assemblage[Symbol.iterator](); }

  getLongHashCode(): bigint {
    let hash = 0n;
    for (const line of this.assemblage) hash += line.getLongHashCode();
    return wrapInt64(hash);
  }

  getHashCode(): number {
    return Number(BigInt.asIntN(32, this.getLongHashCode()));
  }

  // Typed shorthands on lines
  getLineBool(lineName: string): boolean { return this.findLine(lineName)?.getBoolean() ?? false; }
  setLineBool(lineName: string, value: boolean): void { this.findorAddLine(lineName).setBoolean(value); }

  getLineInt(lineName: string, defaultValue: number = 0): number {
    return this.findLine(lineName)?.getInteger() ?? defaultValue;
  }
  setLineInt(lineName: string, value: number): void { this.findorAddLine(lineName).setInteger(value); }

  getLineInt64(lineName: string, defaultValue: bigint = 0n): bigint {
    return this.findLine(lineName)?.getInteger64() ?? defaultValue;
  }
  setLineInt64(lineName: string, value: bigint): void { this.findorAddLine(lineName).setInteger64(value); }

  getLineString(lineName: string, defaultValue?: string | null): string | null {
    return this.findLine(lineName)?.infoDisplay ?? (defaultValue ?? null);
  }
  setLineString(lineName: string, value: string | null): void { this.findorAddLine(lineName).infoDisplay = value ?? ''; }

  getLineDouble(lineName: string, defaultValue: number = 0): number {
    return this.findLine(lineName)?.getDouble() ?? defaultValue;
  }
  setLineDouble(lineName: string, value: number): void { this.findorAddLine(lineName).setDouble(value); }

  getLineFloat(lineName: string, defaultValue?: FInt64): FInt64 {
    return this.findLine(lineName)?.getFloat() ?? (defaultValue ?? FInt64.Zero);
  }
  setLineFloat(lineName: string, value: FInt64): void { this.findorAddLine(lineName).setFloat(value); }

  /** Missing lines give `defaultValue`, or DateTime.MinValue like C#'s `default(DateTime)`. */
  getLineDateTime(lineName: string, defaultValue?: Date): Date {
    return this.findLine(lineName)?.getDateTime() ?? (defaultValue ?? minDate());
  }
  setLineDateTime(lineName: string, value: Date): void { this.findorAddLine(lineName).setDateTime(value); }

  /** Approximate size of the serialized text (`LPS.Length`). */
  get length(): number {
    let len = 3;
    for (const line of this.assemblage) {
      len += line.name.length + line.getStoreString().length + line.textDisplay.length + 6;
      for (const sub of line.subs) len += sub.name.length + sub.getStoreString().length + 3;
    }
    return len;
  }

  get count(): number { return this.assemblage.length; }

  toString(): string {
    const lines = this.assemblage;
    let out = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i > 0) out += '\n';
      out += line instanceof LineBase ? line.toLpsString() : lpsString(line);
    }
    return out;
  }
}
