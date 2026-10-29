import { ISub, ILine, ILpsDocument } from '../types/interfaces';
import { LineDict } from './line-dict';
import { forEachLpsLine, lpsString } from './lps';
import { LineBase } from './line-base';
import { FInt64 } from '../utils/fint64';
import { minDate, wrapInt64 } from '../utils/numeric';

/**
 * LPS document whose lines are keyed by unique name (`LPS_D` in the C# original,
 * the form used by LinePutScript.Localization: `key#value:|`). Adding a line with an
 * existing name replaces it and lookups by name are O(1). Iteration keeps insertion order.
 */
export class LpsDict implements ILpsDocument {
  private _lines: Map<string, ILine> = new Map();

  constructor();
  constructor(lps: string);
  constructor(line: ILine, ...lines: ILine[]);
  constructor(lines: ILine[]);
  constructor(lpsOrLine?: string | ILine | ILine[], ...moreLines: ILine[]) {
    if (lpsOrLine === undefined) return;
    if (typeof lpsOrLine === 'string') { this.load(lpsOrLine); }
    else if (Array.isArray(lpsOrLine)) { this.addRange(lpsOrLine); }
    else { this.addLine(lpsOrLine); this.addRange(moreLines); }
  }

  /** A snapshot array of the lines in insertion order (not a live view). */
  get assemblage(): ILine[] { return Array.from(this._lines.values()); }
  set assemblage(value: ILine[]) {
    this._lines.clear();
    for (const line of value) this._lines.set(line.name, line);
  }

  load(lps: string): void;
  load(lines: ILine[]): void;
  load(lpsOrLines: string | ILine[]): void {
    this._lines.clear();
    if (typeof lpsOrLines === 'string') {
      forEachLpsLine(lpsOrLines, (str) => {
        const line = new LineDict(str);
        this._lines.set(line.name, line);
      });
    } else {
      this.addRange(lpsOrLines);
    }
  }

  clear(): void { this._lines.clear(); }

  addLine(newLine: ILine): void { this._lines.set(newLine.name, newLine); }
  addorReplaceLine(newLine: ILine): void { this._lines.set(newLine.name, newLine); }
  addRange(newLines: ILine[]): void { for (const line of newLines) this._lines.set(line.name, line); }

  /** Lines have no position in a dictionary; this controls the order of iteration only. */
  insertLine(index: number, newLine: ILine): void {
    const lines = this.assemblage.filter((x) => x.name !== newLine.name);
    lines.splice(index, 0, newLine);
    this.assemblage = lines;
  }

  insertRange(index: number, newLines: ILine[]): void {
    const names = new Set(newLines.map((x) => x.name));
    const lines = this.assemblage.filter((x) => !names.has(x.name));
    lines.splice(index, 0, ...newLines);
    this.assemblage = lines;
  }

  remove(target: ILine | string): boolean {
    return this._lines.delete(typeof target === 'string' ? target : target.name);
  }

  removeAll(target: ILine | string): void { this.remove(target); }

  removeAt(index: number): void {
    const line = this.assemblage[index];
    if (line !== undefined) this._lines.delete(line.name);
  }

  contains(target: ILine | ISub): boolean {
    if ('subs' in target) return this._lines.has(target.name);
    for (const line of this._lines.values()) if (line.contains(target)) return true;
    return false;
  }

  containsLine(value: string): boolean { return this._lines.has(value); }

  containsSub(value: string): boolean {
    for (const line of this._lines.values()) if (line.contains(value)) return true;
    return false;
  }

  // Dictionary documents compare the display text (GetString) when matching by info.
  findLine(lineName: string): ILine | null;
  findLine(lineName: string, lineinfo: string): ILine | null;
  findLine(lineName: string, lineinfo?: string): ILine | null {
    const line = this._lines.get(lineName);
    if (line === undefined) return null;
    return lineinfo === undefined || line.infoDisplay === lineinfo ? line : null;
  }

  findLineInfo(lineinfo: string): ILine | null {
    for (const line of this._lines.values()) if (line.infoDisplay === lineinfo) return line;
    return null;
  }

  findorAddLine(lineName: string): ILine {
    let line = this._lines.get(lineName);
    if (line === undefined) {
      line = new LineDict();
      line.name = lineName;
      this._lines.set(lineName, line);
    }
    return line;
  }

  /** Find the line or add an empty one (the C# indexer getter). */
  get(lineName: string): ILine { return this.findorAddLine(lineName); }

  findAllLine(lineName: string): ILine[];
  findAllLine(lineName: string, lineinfo: string): ILine[];
  findAllLine(lineName: string, lineinfo?: string): ILine[] {
    const line = lineinfo === undefined ? (this._lines.get(lineName) ?? null) : this.findLine(lineName, lineinfo);
    return line === null ? [] : [line];
  }

  findAllLineInfo(lineinfo: string): ILine[] {
    return this.assemblage.filter((x) => x.infoDisplay === lineinfo);
  }

  findSub(subName: string): ISub | null;
  findSub(subName: string, subinfo: string): ISub | null;
  findSub(subName: string, subinfo?: string): ISub | null {
    for (const line of this._lines.values()) {
      const r = subinfo !== undefined ? line.find(subName, subinfo) : line.find(subName);
      if (r) return r;
    }
    return null;
  }

  findSubInfo(subinfo: string): ISub | null {
    for (const line of this._lines.values()) { const r = line.findInfo(subinfo); if (r) return r; }
    return null;
  }

  findAllSub(subName: string): ISub[];
  findAllSub(subName: string, subinfo: string): ISub[];
  findAllSub(subName: string, subinfo?: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this._lines.values()) {
      const found = subinfo !== undefined ? line.findAll(subName, subinfo) : line.findAll(subName);
      for (const s of found) results.push(s);
    }
    return results;
  }

  findAllSubInfo(subinfo: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this._lines.values()) for (const s of line.findAllInfo(subinfo)) results.push(s);
    return results;
  }

  searchAllLine(value: string): ILine[] { return this.assemblage.filter((x) => x.name.includes(value)); }

  searchLine(value: string): ILine | null {
    for (const line of this._lines.values()) if (line.name.includes(value)) return line;
    return null;
  }

  searchAllSub(value: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this._lines.values()) for (const s of line.searchAll(value)) results.push(s);
    return results;
  }

  searchSub(value: string): ISub | null {
    for (const line of this._lines.values()) { const r = line.search(value); if (r) return r; }
    return null;
  }

  indexOf(lineName: string): number {
    let i = 0;
    for (const name of this._lines.keys()) {
      if (name === lineName) return i;
      i++;
    }
    return -1;
  }

  indexsOf(lineName: string): number[] {
    const i = this.indexOf(lineName);
    return i === -1 ? [] : [i];
  }

  first(): ILine | null {
    for (const line of this._lines.values()) return line;
    return null;
  }

  last(): ILine | null {
    const lines = this.assemblage;
    return lines.length > 0 ? lines[lines.length - 1] : null;
  }

  toList(): ILine[] { return this.assemblage; }

  [Symbol.iterator](): Iterator<ILine> { return this._lines.values(); }

  getLongHashCode(): bigint {
    let hash = 0n;
    for (const line of this._lines.values()) hash += line.getLongHashCode();
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

  getLineDateTime(lineName: string, defaultValue?: Date): Date {
    return this.findLine(lineName)?.getDateTime() ?? (defaultValue ?? minDate());
  }
  setLineDateTime(lineName: string, value: Date): void { this.findorAddLine(lineName).setDateTime(value); }

  /** Approximate size of the serialized text (`LPS_D.Length`). */
  get length(): number {
    let len = 3;
    for (const line of this._lines.values()) {
      len += line.name.length + line.getStoreString().length + line.textDisplay.length + 6;
      for (const sub of line.subs) len += sub.name.length + sub.getStoreString().length + 3;
    }
    return len;
  }

  get count(): number { return this._lines.size; }

  toString(): string {
    let out = '';
    let first = true;
    for (const line of this._lines.values()) {
      if (!first) out += '\n';
      first = false;
      out += line instanceof LineBase ? line.toLpsString() : lpsString(line);
    }
    return out;
  }
}
