import { ILine, ISub } from '../types/interfaces';
import { Sub } from './sub';
import { FInt64 } from '../utils/fint64';
import { getHashCode } from '../utils/hashing';
import { textDeReplace, textReplace } from '../utils/escaping';
import { formatDouble, minDate, tryParseDouble, tryParseInt32, tryParseInt64, wrapInt64 } from '../utils/numeric';
import { StringStructure } from '../structure/string-structure';

/**
 * Behaviour shared by {@link Line} (ordered list of subs) and {@link LineDict}
 * (subs keyed by unique name): the text part, comments, parsing, serialisation,
 * hashing and the typed `getSub*` / `setSub*` shorthands. Storage lives in the subclasses.
 */
export abstract class LineBase extends Sub implements ILine {
  protected _text: string = '';
  public comments: string = '';
  private _texts: StringStructure | null = null;

  // ---- storage contract ---------------------------------------------------
  abstract get subs(): ISub[];
  abstract set subs(value: ISub[]);
  abstract get count(): number;
  abstract addSub(newSub: ISub): void;
  abstract addorReplaceSub(newSub: ISub): void;
  abstract insertSub(index: number, newSub: ISub): void;
  abstract remove(target: ISub | string): boolean;
  abstract removeAll(subName: string): void;
  abstract removeAt(index: number): void;
  abstract contains(target: ISub | string): boolean;
  abstract clear(): void;
  abstract at(index: number): ISub | undefined;
  abstract find(subName: string): ISub | null;
  abstract find(subName: string, subinfo: string): ISub | null;
  abstract findInfo(subinfo: string): ISub | null;
  abstract findAll(subName: string): ISub[];
  abstract findAll(subName: string, subinfo: string): ISub[];
  abstract findAllInfo(subinfo: string): ISub[];
  abstract indexOf(subName: string): number;
  abstract indexsOf(subName: string): number[];
  abstract [Symbol.iterator](): Iterator<ISub>;
  abstract clone(): LineBase;

  // ---- construction -------------------------------------------------------

  /** Shared constructor logic (subclass fields are ready when this runs). */
  protected _init(
    nameOrLps: string | ILine | undefined,
    info: string | undefined,
    textOrSubs: string | ISub[] | undefined,
    rest: Array<ISub | string | undefined>,
  ): void {
    if (nameOrLps === undefined) return;
    if (typeof nameOrLps !== 'string') {
      this.load(nameOrLps);
    } else if (info === undefined) {
      this.load(nameOrLps);
    } else if (Array.isArray(textOrSubs)) {
      this.load(nameOrLps, info, typeof rest[0] === 'string' ? rest[0] : undefined, textOrSubs);
    } else {
      this.load(nameOrLps, info, textOrSubs, rest as ISub[]);
    }
  }

  load(lps: string): void;
  load(name: string, info: string, text?: string, subs?: ISub[]): void;
  load(line: ILine): void;
  load(nameOrLps: string | ILine, info?: string, text?: string, subs?: ISub[]): void {
    if (typeof nameOrLps !== 'string') {
      this.name = nameOrLps.name;
      this._copyInfoFrom(nameOrLps);
      this._text = nameOrLps.text;
      this.comments = nameOrLps.comments;
      this.clear();
      for (const sub of nameOrLps.subs) this.addSub(sub);
    } else if (info === undefined) {
      this._parse(nameOrLps);
    } else {
      this.name = nameOrLps;
      this._setStoreOnly(textReplace(info));
      this._text = textReplace(text ?? '');
      this.comments = '';
      this.clear();
      if (subs) for (const sub of subs) this.addSub(sub);
    }
  }

  /**
   * Parse `name#info:|sub#info:|...text///comments`. The comment is cut at the first
   * "///", the head is the first ":|" segment and the text is the last one (for a
   * line without any ":|" the whole body is both name and text, as in the original).
   */
  private _parse(lps: string): void {
    let body = lps;
    const c = lps.indexOf('///');
    if (c === -1) {
      this.comments = '';
    } else {
      this.comments = lps.substring(c + 3);
      body = lps.substring(0, c);
    }
    this.clear();
    let head: string;
    const first = body.indexOf(':|');
    if (first === -1) {
      head = body;
      this._text = body;
    } else {
      head = body.substring(0, first);
      let pos = first + 2;
      for (;;) {
        const next = body.indexOf(':|', pos);
        if (next === -1) break;
        this.addSub(Sub.parse(body.substring(pos, next)));
        pos = next + 2;
      }
      this._text = body.substring(pos);
    }
    const h = head.indexOf('#');
    if (h === -1) {
      this.name = head;
      this._setStoreOnly('');
    } else {
      this.name = head.substring(0, h);
      this._setStoreOnly(head.substring(h + 1));
    }
  }

  // ---- text part ----------------------------------------------------------

  /** Escaped text stored after the last ":|". */
  get text(): string { return this._text; }
  set text(value: string) { this._text = value; }

  /** De-escaped text. */
  get textDisplay(): string { return textDeReplace(this._text); }
  set textDisplay(value: string) { this._text = textReplace(value); }

  get textToInt(): number { return tryParseInt32(this._text) ?? 0; }
  set textToInt(value: number) { this._text = String(Math.trunc(value)); }

  get textToInt64(): bigint { return tryParseInt64(this._text) ?? 0n; }
  set textToInt64(value: bigint) { this._text = value.toString(); }

  get textToDouble(): number { return tryParseDouble(this._text) ?? 0; }
  set textToDouble(value: number) { this._text = formatDouble(value); }

  getText(): string { return this.textDisplay; }

  get texts(): StringStructure {
    if (this._texts === null) this._texts = new StringStructure((x) => { this._text = x; }, () => this._text);
    return this._texts;
  }

  // ---- list helpers built on the storage contract ------------------------

  addRange(newSubs: ISub[]): void {
    for (const sub of newSubs) this.addSub(sub);
  }

  insertRange(index: number, newSubs: ISub[]): void {
    for (const sub of newSubs) this.insertSub(index++, sub);
  }

  removeByName(subName: string): boolean {
    return this.remove(subName);
  }

  containsByName(value: string): boolean {
    return this.contains(value);
  }

  /** Find a sub by name, adding an empty one when it does not exist (the C# indexer getter). */
  findorAdd(subName: string): ISub {
    const existing = this.find(subName);
    if (existing !== null) return existing;
    const sub = new Sub();
    sub.name = subName;
    this.addSub(sub);
    return sub;
  }

  get(subName: string): ISub {
    return this.findorAdd(subName);
  }

  searchAll(value: string): ISub[] {
    return this.subs.filter((x) => x.name.includes(value));
  }

  search(value: string): ISub | null {
    for (const sub of this.subs) if (sub.name.includes(value)) return sub;
    return null;
  }

  firstSub(): ISub | null {
    return this.at(0) ?? null;
  }

  lastSub(): ISub | null {
    return this.at(-1) ?? null;
  }

  toList(): ISub[] {
    return this.subs.slice();
  }

  // ---- typed shorthands ---------------------------------------------------

  getSubBool(subName: string): boolean { return this.find(subName)?.getBoolean() ?? false; }
  setSubBool(subName: string, value: boolean): void { this.findorAdd(subName).setBoolean(value); }

  getSubInt(subName: string, defaultValue: number = 0): number {
    return this.find(subName)?.getInteger() ?? defaultValue;
  }
  setSubInt(subName: string, value: number): void { this.findorAdd(subName).setInteger(value); }

  getSubInt64(subName: string, defaultValue: bigint = 0n): bigint {
    return this.find(subName)?.getInteger64() ?? defaultValue;
  }
  setSubInt64(subName: string, value: bigint): void { this.findorAdd(subName).setInteger64(value); }

  getSubFloat(subName: string, defaultValue?: FInt64): FInt64 {
    return this.find(subName)?.getFloat() ?? defaultValue ?? FInt64.Zero;
  }
  setSubFloat(subName: string, value: FInt64): void { this.findorAdd(subName).setFloat(value); }

  /** Missing subs give `defaultValue`, or DateTime.MinValue like C#'s `default(DateTime)`. */
  getSubDateTime(subName: string, defaultValue?: Date): Date {
    return this.find(subName)?.getDateTime() ?? defaultValue ?? minDate();
  }
  setSubDateTime(subName: string, value: Date): void { this.findorAdd(subName).setDateTime(value); }

  getSubString(subName: string, defaultValue?: string | null): string | null {
    return this.find(subName)?.infoDisplay ?? defaultValue ?? null;
  }
  setSubString(subName: string, value: string | null): void { this.findorAdd(subName).infoDisplay = value ?? ''; }

  getSubDouble(subName: string, defaultValue: number = 0): number {
    return this.find(subName)?.getDouble() ?? defaultValue;
  }
  setSubDouble(subName: string, value: number): void { this.findorAdd(subName).setDouble(value); }

  // ---- identity / serialisation -------------------------------------------

  getLongHashCode(): bigint {
    let hash = getHashCode(this.name) * 2n + getHashCode(this.getStoreString()) * 3n + getHashCode(this._text) * 4n;
    for (const sub of this.subs) hash += sub.getLongHashCode();
    return wrapInt64(hash);
  }

  /**
   * `name#info:|sub:|sub:|text///comments`. With a `sb` array (the C# `ToString(StringBuilder)`)
   * the line is also appended as a new "\n"-prefixed entry and ":|" is always written;
   * without it, a line with neither name nor info omits the ":|" like the original.
   */
  toString(sb?: string[]): string {
    if (sb !== undefined) {
      const out = this.toLpsString();
      sb.push('\n', out);
      return out;
    }
    let out = this.name;
    const store = this.getStoreString();
    if (store !== '') out += '#' + store;
    if (out.length !== 0) out += ':|';
    return out + this._tail();
  }

  /** The line as written to a file:  is always present, even for an empty name and info. */
  toLpsString(): string {
    const store = this.getStoreString();
    return (store === '' ? this.name : this.name + '#' + store) + ':|' + this._tail();
  }

  /** Subs, text and comments (everything after the head). */
  private _tail(): string {
    let out = '';
    const subs = this.subs;
    for (let i = 0; i < subs.length; i++) out += subs[i].toString();
    out += this._text;
    return this.comments === '' ? out : out + '///' + this.comments;
  }
}
