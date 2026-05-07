import { ISub, ILine, ILpsDocument } from '../types/interfaces';
import { Line } from './line';
import { FInt64 } from '../utils/fint64';

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
      this.assemblage = [];
      const normalized = lpsOrLines.replace(/\r/g, '').replace(/:\n\|/g, '/n').replace(/:\n:/g, '');
      const file = normalized.split('\n').filter(line => line.trim().length > 0);
      for (const str of file) {
        const line = new Line();
        line.load(str);
        this.assemblage.push(line);
      }
    } else {
      this.assemblage = [];
      this.addRange(lpsOrLines);
    }
  }

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
    if (typeof target === 'string') {
      for (let i = 0; i < this.assemblage.length; i++) {
        if (this.assemblage[i].name === target) { this.assemblage.splice(i, 1); return true; }
      }
      return false;
    }
    const idx = this.assemblage.indexOf(target);
    if (idx === -1) return false;
    this.assemblage.splice(idx, 1);
    return true;
  }

  removeAll(target: ILine | string): void {
    if (typeof target === 'string') {
      for (let i = this.assemblage.length - 1; i >= 0; i--)
        if (this.assemblage[i].name === target) this.assemblage.splice(i, 1);
    } else {
      for (let i = this.assemblage.length - 1; i >= 0; i--)
        if (this.assemblage[i] === target) this.assemblage.splice(i, 1);
    }
  }

  removeAt(index: number): void { this.assemblage.splice(index, 1); }

  contains(target: ILine | ISub): boolean {
    if ('subs' in target) return this.assemblage.includes(target as ILine);
    return this.assemblage.some(line => line.contains(target as ISub));
  }

  containsLine(value: string): boolean { return this.assemblage.some(line => line.name === value); }
  containsSub(value: string): boolean { return this.assemblage.some(line => line.containsByName(value)); }

  findLine(lineName: string): ILine | null;
  findLine(lineName: string, lineinfo: string): ILine | null;
  findLine(lineName: string, lineinfo?: string): ILine | null {
    if (lineinfo === undefined) return this.assemblage.find(x => x.name === lineName) ?? null;
    return this.assemblage.find(x => x.name === lineName && x.info === lineinfo) ?? null;
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
    for (const line of this.assemblage) results.push(...(subinfo !== undefined ? line.findAll(subName, subinfo) : line.findAll(subName)));
    return results;
  }

  findAllSubInfo(subinfo: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this.assemblage) results.push(...line.findAllInfo(subinfo));
    return results;
  }

  searchAllLine(value: string): ILine[] { return this.assemblage.filter(x => x.name.includes(value)); }
  searchLine(value: string): ILine | null { return this.assemblage.find(x => x.name.includes(value)) ?? null; }

  searchAllSub(value: string): ISub[] {
    const results: ISub[] = [];
    for (const line of this.assemblage) results.push(...line.searchAll(value));
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

  getLongHashCode(): bigint {
    let hash = 0n;
    for (const line of this.assemblage) hash += line.getLongHashCode();
    return hash;
  }

  // Typed shorthands on lines
  getLineBool(lineName: string): boolean { return this.findLine(lineName)?.getBoolean() ?? false; }
  setLineBool(lineName: string, value: boolean): void { this.findorAddLine(lineName).infoToBoolean = value; }

  getLineInt(lineName: string, defaultValue: number = 0): number {
    return this.findLine(lineName)?.infoToInt ?? defaultValue;
  }
  setLineInt(lineName: string, value: number): void { this.findorAddLine(lineName).infoToInt = value; }

  getLineInt64(lineName: string, defaultValue: bigint = 0n): bigint {
    return this.findLine(lineName)?.infoToInt64 ?? defaultValue;
  }
  setLineInt64(lineName: string, value: bigint): void { this.findorAddLine(lineName).infoToInt64 = value; }

  getLineString(lineName: string, defaultValue?: string | null): string | null {
    return this.findLine(lineName)?.infoDisplay ?? (defaultValue ?? null);
  }
  setLineString(lineName: string, value: string | null): void { this.findorAddLine(lineName).infoDisplay = value ?? ''; }

  getLineDouble(lineName: string, defaultValue: number = 0): number {
    return this.findLine(lineName)?.infoToDouble ?? defaultValue;
  }
  setLineDouble(lineName: string, value: number): void { this.findorAddLine(lineName).infoToDouble = value; }

  getLineFloat(lineName: string, defaultValue?: FInt64): FInt64 {
    return this.findLine(lineName)?.getFloat() ?? (defaultValue ?? FInt64.Zero);
  }
  setLineFloat(lineName: string, value: FInt64): void { this.findorAddLine(lineName).setFloat(value); }

  getLineDateTime(lineName: string, defaultValue?: Date): Date | null {
    return this.findLine(lineName)?.getDateTime() ?? (defaultValue ?? null);
  }
  setLineDateTime(lineName: string, value: Date): void { this.findorAddLine(lineName).setDateTime(value); }

  get length(): number {
    let len = 3;
    for (const line of this.assemblage) {
      len += line.name.length + line.getStoreString().length + line.text.length + 6;
      for (const sub of line.subs) len += sub.name.length + sub.getStoreString().length + 3;
    }
    return len;
  }

  get count(): number { return this.assemblage.length; }

  toString(): string { return this.assemblage.map(line => line.toString()).join('\n'); }
}
