import { ISub, ILine } from '../types/interfaces';
import { Sub } from './sub';
import { FInt64 } from '../utils/fint64';
import { getHashCode } from '../utils/hashing';
import { splitLimited } from '../utils/parsing';
import { StringStructure } from '../structure/string-structure';
import * as esc from '../utils/escaping';

export class Line extends Sub implements ILine {
  public subs: ISub[];
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
    this.subs = [];

    if (nameOrLps === undefined) return;
    if (typeof nameOrLps !== 'string') {
      this.name = nameOrLps.name;
      this._info = nameOrLps.info;
      this._text = nameOrLps.text;
      this.comments = nameOrLps.comments;
      for (const sub of nameOrLps.subs) this.subs.push(sub);
      return;
    }
    if (info === undefined) {
      this.load(nameOrLps);
    } else {
      this.name = nameOrLps;
      this._info = esc.textReplace(info);
      this._text = esc.textReplace(text ?? '');
      for (const sub of subs) this.subs.push(sub);
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
      this.subs = [];
      for (const sub of nameOrLps.subs) this.subs.push(sub);
    } else if (info === undefined) {
      const sts = splitLimited(nameOrLps, '///', 1);
      if (sts.length === 2) this.comments = sts[1];
      const parts = sts[0].split(':|');
      const st = splitLimited(parts[0], '#', 1);
      this.name = st[0];
      this._info = st.length > 1 ? st[1] : '';
      this._text = parts[parts.length - 1];
      this.subs = [];
      for (let i = 1; i < parts.length - 1; i++) {
        const sub = new Sub();
        sub.load(parts[i]);
        this.subs.push(sub);
      }
    } else {
      this.name = nameOrLps;
      this._info = esc.textReplace(info);
      this._text = esc.textReplace(text ?? '');
      this.subs = [];
      if (subs) for (const sub of subs) this.subs.push(sub);
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

  addSub(newSub: ISub): void { this.subs.push(newSub); }

  addorReplaceSub(newSub: ISub): void {
    const old = this.find(newSub.name);
    if (old) old.set(newSub);
    else this.subs.push(newSub);
  }

  addRange(newSubs: ISub[]): void { for (const sub of newSubs) this.subs.push(sub); }

  insertSub(index: number, newSub: ISub): void { this.subs.splice(index, 0, newSub); }
  insertRange(index: number, newSubs: ISub[]): void { this.subs.splice(index, 0, ...newSubs); }

  remove(sub: ISub): boolean {
    const idx = this.subs.indexOf(sub);
    if (idx === -1) return false;
    this.subs.splice(idx, 1);
    return true;
  }

  removeByName(subName: string): boolean {
    for (let i = 0; i < this.subs.length; i++) {
      if (this.subs[i].name === subName) { this.subs.splice(i, 1); return true; }
    }
    return false;
  }

  removeAll(subName: string): void {
    for (let i = this.subs.length - 1; i >= 0; i--)
      if (this.subs[i].name === subName) this.subs.splice(i, 1);
  }

  removeAt(index: number): void { this.subs.splice(index, 1); }

  contains(sub: ISub): boolean { return this.subs.indexOf(sub) !== -1; }
  containsByName(value: string): boolean { return this.subs.some(x => x.name === value); }

  find(subName: string): ISub | null;
  find(subName: string, subinfo: string): ISub | null;
  find(subName: string, subinfo?: string): ISub | null {
    if (subinfo === undefined) return this.subs.find(x => x.name === subName) ?? null;
    return this.subs.find(x => x.name === subName && x.info === subinfo) ?? null;
  }

  findInfo(subinfo: string): ISub | null {
    return this.subs.find(x => x.info === subinfo) ?? null;
  }

  findAll(subName: string): ISub[];
  findAll(subName: string, subinfo: string): ISub[];
  findAll(subName: string, subinfo?: string): ISub[] {
    if (subinfo === undefined) return this.subs.filter(x => x.name === subName);
    return this.subs.filter(x => x.name === subName && x.info === subinfo);
  }

  findAllInfo(subinfo: string): ISub[] {
    return this.subs.filter(x => x.info === subinfo);
  }

  findorAdd(subName: string): ISub {
    const existing = this.find(subName);
    if (existing) return existing;
    const sub = new Sub();
    sub.name = subName;
    this.subs.push(sub);
    return sub;
  }

  searchAll(value: string): ISub[] { return this.subs.filter(x => x.name.includes(value)); }
  search(value: string): ISub | null { return this.subs.find(x => x.name.includes(value)) ?? null; }

  indexOf(subName: string): number { return this.subs.findIndex(x => x.name === subName); }

  indexsOf(subName: string): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.subs.length; i++)
      if (this.subs[i].name === subName) indices.push(i);
    return indices;
  }

  // Typed shorthands on subs
  getSubBool(subName: string): boolean { return this.find(subName)?.getBoolean() ?? false; }
  setSubBool(subName: string, value: boolean): void { this.findorAdd(subName).infoToBoolean = value; }

  getSubInt(subName: string, defaultValue: number = 0): number {
    return this.find(subName)?.infoToInt ?? defaultValue;
  }
  setSubInt(subName: string, value: number): void { this.findorAdd(subName).infoToInt = value; }

  getSubInt64(subName: string, defaultValue: bigint = 0n): bigint {
    return this.find(subName)?.infoToInt64 ?? defaultValue;
  }
  setSubInt64(subName: string, value: bigint): void { this.findorAdd(subName).infoToInt64 = value; }

  getSubFloat(subName: string, defaultValue?: FInt64): FInt64 {
    return this.find(subName)?.getFloat() ?? (defaultValue ?? FInt64.Zero);
  }
  setSubFloat(subName: string, value: FInt64): void { this.findorAdd(subName).setFloat(value); }

  getSubDateTime(subName: string, defaultValue?: Date): Date | null {
    return this.find(subName)?.getDateTime() ?? (defaultValue ?? null);
  }
  setSubDateTime(subName: string, value: Date): void { this.findorAdd(subName).setDateTime(value); }

  getSubString(subName: string, defaultValue?: string | null): string | null {
    return this.find(subName)?.infoDisplay ?? (defaultValue ?? null);
  }
  setSubString(subName: string, value: string | null): void { this.findorAdd(subName).infoDisplay = value ?? ''; }

  getSubDouble(subName: string, defaultValue: number = 0): number {
    return this.find(subName)?.infoToDouble ?? defaultValue;
  }
  setSubDouble(subName: string, value: number): void { this.findorAdd(subName).infoToDouble = value; }

  getLongHashCode(): bigint {
    let hash = getHashCode(this.name) * 2n + getHashCode(this._info) * 3n + getHashCode(this._text) * 4n;
    for (const sub of this.subs) hash += sub.getLongHashCode();
    return hash;
  }

  toList(): ISub[] { return [...this.subs]; }

  toString(sb?: string[]): string {
    const parts: string[] = [this.name];
    if (this._info) parts.push(`#${this._info}`);
    if (parts.length > 0 || this.subs.length > 0 || this._text || this.comments) parts.push(':|');
    for (const sub of this.subs) parts.push(sub.toString());
    parts.push(this._text);
    if (this.comments) parts.push(`///${this.comments}`);
    const result = parts.join('');
    if (sb) { sb.push('\n'); sb.push(result); }
    return result;
  }
}
