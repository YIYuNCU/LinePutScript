import { ISub, ILine } from '../types/interfaces';
import { Sub } from './sub';
import { FInt64 } from '../utils/fint64';
import { getHashCode } from '../utils/hashing';
import { splitLimited } from '../utils/parsing';
import { StringStructure } from '../structure/string-structure';
import * as esc from '../utils/escaping';

export class LineDict extends Sub implements ILine {
  private _subs: Map<string, ISub>;
  public _text: string;
  public comments: string;

  constructor();
  constructor(lpsLine: string);
  constructor(line: ILine);
  constructor(name: string, info: string, text?: string, ...subs: ISub[]);
  constructor(nameOrLps?: string | ILine, info?: string, text?: string, ...subs: ISub[]) {
    super();
    this._text = '';
    this.comments = '';
    this._subs = new Map();

    if (nameOrLps === undefined) return;
    if (typeof nameOrLps !== 'string') {
      this.name = nameOrLps.name;
      this._info = nameOrLps.info;
      this._text = nameOrLps.text;
      this.comments = nameOrLps.comments;
      for (const sub of nameOrLps.subs) this._subs.set(sub.name, sub);
      return;
    }
    if (info === undefined) {
      this.load(nameOrLps);
    } else {
      this.name = nameOrLps;
      this._info = esc.textReplace(info);
      this._text = esc.textReplace(text ?? '');
      for (const sub of subs) this._subs.set(sub.name, sub);
    }
  }

  load(lps: string): void;
  load(name: string, info: string, text?: string, subs?: ISub[]): void;
  load(line: ILine): void;
  load(nameOrLps: string | ILine, info?: string, text?: string, subs?: ISub[]): void {
    if (typeof nameOrLps !== 'string') {
      this.name = nameOrLps.name;
      this._info = nameOrLps.info;
      this._text = nameOrLps.text;
      this.comments = nameOrLps.comments;
      this._subs.clear();
      for (const sub of nameOrLps.subs) this._subs.set(sub.name, sub);
    } else if (info === undefined) {
      const sts = splitLimited(nameOrLps, '///', 1);
      if (sts.length === 2) this.comments = sts[1];
      const parts = sts[0].split(':|');
      const st = splitLimited(parts[0], '#', 1);
      this.name = st[0];
      this._info = st.length > 1 ? st[1] : '';
      this._text = parts[parts.length - 1];
      this._subs.clear();
      for (let i = 1; i < parts.length - 1; i++) {
        const sub = new Sub();
        sub.load(parts[i]);
        this._subs.set(sub.name, sub);
      }
    } else {
      this.name = nameOrLps;
      this._info = esc.textReplace(info);
      this._text = esc.textReplace(text ?? '');
      this._subs.clear();
      if (subs) for (const sub of subs) this._subs.set(sub.name, sub);
    }
  }

  get text(): string { return this._text; }
  set text(value: string) { this._text = value; }

  get textDisplay(): string { return esc.textDeReplace(this._text); }
  set textDisplay(value: string) { this._text = esc.textReplace(value); }

  get textToInt(): number { return parseInt(this._text, 10) || 0; }
  set textToInt(value: number) { this._text = value.toString(); }

  get textToInt64(): bigint { return BigInt(this._text || '0'); }
  set textToInt64(value: bigint) { this._text = value.toString(); }

  get textToDouble(): number { return parseFloat(this._text) || 0; }
  set textToDouble(value: number) { this._text = value.toString(); }

  getText(): string { return this.textDisplay; }

  private _texts: StringStructure | null = null;
  get texts(): StringStructure {
    if (!this._texts) this._texts = new StringStructure(x => { this._text = x; }, () => this._text);
    return this._texts;
  }

  get subs(): ISub[] { return Array.from(this._subs.values()); }
  set subs(value: ISub[]) {
    this._subs.clear();
    for (const sub of value) this._subs.set(sub.name, sub);
  }

  addSub(newSub: ISub): void { this._subs.set(newSub.name, newSub); }
  addorReplaceSub(newSub: ISub): void { this._subs.set(newSub.name, newSub); }
  addRange(newSubs: ISub[]): void { for (const sub of newSubs) this._subs.set(sub.name, sub); }

  insertSub(index: number, newSub: ISub): void {
    const entries = Array.from(this._subs.entries());
    entries.splice(index, 0, [newSub.name, newSub]);
    this._subs = new Map(entries);
  }

  insertRange(index: number, newSubs: ISub[]): void {
    const entries = Array.from(this._subs.entries());
    const insert: [string, ISub][] = newSubs.map(s => [s.name, s]);
    entries.splice(index, 0, ...insert);
    this._subs = new Map(entries);
  }

  remove(sub: ISub): boolean { return this._subs.delete(sub.name); }
  removeByName(subName: string): boolean { return this._subs.delete(subName); }
  removeAll(subName: string): void { this._subs.delete(subName); }

  removeAt(index: number): void {
    const entries = Array.from(this._subs.entries());
    if (index < entries.length) {
      entries.splice(index, 1);
      this._subs = new Map(entries);
    }
  }

  contains(sub: ISub): boolean {
    const existing = this._subs.get(sub.name);
    return existing !== undefined && existing.info === sub.info;
  }

  containsByName(value: string): boolean { return this._subs.has(value); }

  find(subName: string): ISub | null;
  find(subName: string, subinfo: string): ISub | null;
  find(subName: string, subinfo?: string): ISub | null {
    const sub = this._subs.get(subName);
    if (!sub) return null;
    if (subinfo !== undefined && sub.info !== subinfo) return null;
    return sub;
  }

  findInfo(subinfo: string): ISub | null {
    for (const sub of this._subs.values()) if (sub.info === subinfo) return sub;
    return null;
  }

  findAll(subName: string): ISub[];
  findAll(subName: string, subinfo: string): ISub[];
  findAll(subName: string, subinfo?: string): ISub[] {
    const sub = this._subs.get(subName);
    if (!sub) return [];
    if (subinfo !== undefined && sub.info !== subinfo) return [];
    return [sub];
  }

  findAllInfo(subinfo: string): ISub[] {
    const result: ISub[] = [];
    for (const sub of this._subs.values()) if (sub.info === subinfo) result.push(sub);
    return result;
  }

  findorAdd(subName: string): ISub {
    const existing = this._subs.get(subName);
    if (existing) return existing;
    const sub = new Sub();
    sub.name = subName;
    this._subs.set(subName, sub);
    return sub;
  }

  searchAll(value: string): ISub[] { return this.subs.filter(x => x.name.includes(value)); }
  search(value: string): ISub | null { return this.subs.find(x => x.name.includes(value)) ?? null; }

  indexOf(subName: string): number { return Array.from(this._subs.keys()).indexOf(subName); }

  indexsOf(subName: string): number[] {
    const idx = this.indexOf(subName);
    return idx >= 0 ? [idx] : [];
  }

  // Typed shorthands on subs
  getSubBool(subName: string): boolean { return this._subs.get(subName)?.getBoolean() ?? false; }
  setSubBool(subName: string, value: boolean): void { this.findorAdd(subName).infoToBoolean = value; }

  getSubInt(subName: string, defaultValue: number = 0): number {
    return this._subs.get(subName)?.infoToInt ?? defaultValue;
  }
  setSubInt(subName: string, value: number): void { this.findorAdd(subName).infoToInt = value; }

  getSubInt64(subName: string, defaultValue: bigint = 0n): bigint {
    return this._subs.get(subName)?.infoToInt64 ?? defaultValue;
  }
  setSubInt64(subName: string, value: bigint): void { this.findorAdd(subName).infoToInt64 = value; }

  getSubFloat(subName: string, defaultValue?: FInt64): FInt64 {
    return this._subs.get(subName)?.getFloat() ?? (defaultValue ?? FInt64.Zero);
  }
  setSubFloat(subName: string, value: FInt64): void { this.findorAdd(subName).setFloat(value); }

  getSubDateTime(subName: string, defaultValue?: Date): Date | null {
    return this._subs.get(subName)?.getDateTime() ?? (defaultValue ?? null);
  }
  setSubDateTime(subName: string, value: Date): void { this.findorAdd(subName).setDateTime(value); }

  getSubString(subName: string, defaultValue?: string | null): string | null {
    return this._subs.get(subName)?.infoDisplay ?? (defaultValue ?? null);
  }
  setSubString(subName: string, value: string | null): void { this.findorAdd(subName).infoDisplay = value ?? ''; }

  getSubDouble(subName: string, defaultValue: number = 0): number {
    return this._subs.get(subName)?.infoToDouble ?? defaultValue;
  }
  setSubDouble(subName: string, value: number): void { this.findorAdd(subName).infoToDouble = value; }

  getLongHashCode(): bigint {
    let hash = getHashCode(this.name) * 2n + getHashCode(this._info) * 3n + getHashCode(this._text) * 4n;
    for (const sub of this._subs.values()) hash += sub.getLongHashCode();
    return hash;
  }

  toList(): ISub[] { return this.subs; }

  toString(sb?: string[]): string {
    const parts: string[] = [this.name];
    if (this._info) parts.push(`#${this._info}`);
    if (parts.length > 0 || this._subs.size > 0 || this._text || this.comments) parts.push(':|');
    for (const sub of this._subs.values()) parts.push(sub.toString());
    parts.push(this._text);
    if (this.comments) parts.push(`///${this.comments}`);
    const result = parts.join('');
    if (sb) { sb.push('\n'); sb.push(result); }
    return result;
  }
}
