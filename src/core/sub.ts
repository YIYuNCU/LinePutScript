import { ISub } from '../types/interfaces';
import { textDeReplace, textReplace } from '../utils/escaping';
import { getHashCode, getHashCode32 } from '../utils/hashing';
import { FInt64 } from '../utils/fint64';
import { splitLimited } from '../utils/parsing';
import { tryParseInt64, wrapInt64 } from '../utils/numeric';
import { StringStructure } from '../structure/string-structure';
import {
  SetObject,
  strToBool,
  strToDate,
  strToDouble,
  strToInt,
  strToInt64,
} from '../structure/set-object';

/**
 * The smallest LinePutScript unit: a name plus one value (`name#info:|`).
 *
 * The value is kept as the escaped storage string it was read from; the first
 * typed write (`setInteger`, `infoToDouble = ...`) moves it into a
 * {@link SetObject} so typed reads of the same kind need no text conversion.
 */
export class Sub implements ISub {
  public name: string;
  /** Storage string; authoritative while `_obj` is null. */
  protected _info: string;
  /** Typed value; authoritative once it exists. */
  protected _obj: SetObject | null;
  private _infos: StringStructure | null;

  constructor();
  constructor(lpsSub: string);
  constructor(sub: ISub);
  constructor(name: string, info: string | SetObject);
  constructor(name: string, ...infos: string[]);
  constructor(nameOrLps?: string | ISub, infoOrSecond?: string | SetObject, ...rest: string[]) {
    this.name = '';
    this._info = '';
    this._obj = null;
    this._infos = null;
    if (nameOrLps === undefined) return;
    if (typeof nameOrLps !== 'string') {
      this.name = nameOrLps.name;
      this._copyInfoFrom(nameOrLps);
    } else if (infoOrSecond === undefined) {
      this.load(nameOrLps);
    } else {
      this.name = nameOrLps;
      if (infoOrSecond instanceof SetObject) {
        this._obj = infoOrSecond;
      } else if (rest.length > 0) {
        let joined = textReplace(infoOrSecond);
        for (const s of rest) joined += ',' + textReplace(s);
        this._info = joined.replace(/,+$/, '');
      } else {
        this._info = textReplace(infoOrSecond);
      }
    }
  }

  /** @internal Fast construction from an already escaped storage string (used by the parsers). */
  static fromStore(name: string, store: string): Sub {
    const sub = new Sub();
    sub.name = name;
    sub._info = store;
    return sub;
  }

  /** @internal Parse one `name#info` segment of a line (info is already escaped). */
  static parse(lps: string): Sub {
    const p = lps.indexOf('#');
    return p === -1 ? Sub.fromStore(lps, '') : Sub.fromStore(lps.substring(0, p), lps.substring(p + 1));
  }

  // ---- raw access ---------------------------------------------------------

  /** The text as it is written to a file (escaped). */
  getStoreString(): string {
    return this._obj === null ? this._info : this._obj.getStoreString();
  }

  /** The human readable text of the value before de-escaping. */
  protected get _raw(): string {
    return this._obj === null ? this._info : this._obj.getString();
  }

  /** The underlying typed value container (shared: changes are visible in this Sub). */
  get infoObject(): SetObject {
    if (this._obj === null) this._obj = new SetObject(this._info);
    return this._obj;
  }

  /** Replace the stored text without touching the parsed `infos` cache. */
  protected _setRaw(value: string): void {
    if (this._obj !== null) this._obj.setString(value);
    else this._info = value;
  }

  protected _changed(): void {
    if (this._infos !== null) this._infos.invalidate();
  }

  protected _copyInfoFrom(other: ISub): void {
    if (other instanceof Sub && other._obj !== null) {
      this._obj = other._obj.clone();
      this._info = '';
    } else {
      this._obj = null;
      this._info = other.info;
    }
    this._changed();
  }

  // ---- typed getters ------------------------------------------------------

  getString(): string {
    return this.infoDisplay;
  }

  getInteger(): number {
    return this._obj === null ? strToInt(this._info) : this._obj.getInteger();
  }

  getInteger64(): bigint {
    return this._obj === null ? strToInt64(this._info) : this._obj.getInteger64();
  }

  getDouble(): number {
    return this._obj === null ? strToDouble(this._info) : this._obj.getDouble();
  }

  getFloat(): FInt64 {
    return this._obj === null ? FInt64.parse(this._info) : this._obj.getFloat();
  }

  getDateTime(): Date {
    return this._obj === null ? strToDate(this._info) : this._obj.getDateTime();
  }

  getBoolean(): boolean {
    return this._obj === null ? strToBool(this._info) : this._obj.getBoolean();
  }

  // ---- typed setters ------------------------------------------------------

  /** Set display text; it is escaped for storage. */
  setString(value: string): void {
    this.infoDisplay = value;
  }

  private _typed(): SetObject {
    if (this._obj === null) this._obj = new SetObject(this._info);
    this._changed();
    return this._obj;
  }

  setInteger(value: number): void { this._typed().setInteger(value); }
  setInteger64(value: bigint): void { this._typed().setInteger64(value); }
  setDouble(value: number): void { this._typed().setDouble(value); }
  setFloat(value: FInt64): void { this._typed().setFloat(value); }
  setDateTime(value: Date): void { this._typed().setDateTime(value); }
  setBoolean(value: boolean): void { this._typed().setBoolean(value); }

  // ---- info properties ----------------------------------------------------

  /** Escaped storage text (no LPS keywords inside). */
  get info(): string { return this.getStoreString(); }
  set info(value: string) {
    this._setRaw(value);
    this._changed();
  }

  /** Display text (de-escaped). */
  get infoDisplay(): string { return textDeReplace(this._raw); }
  set infoDisplay(value: string) { this.info = textReplace(value); }

  get infoToInt(): number { return this.getInteger(); }
  set infoToInt(value: number) { this.setInteger(value); }

  get infoToInt64(): bigint { return this.getInteger64(); }
  set infoToInt64(value: bigint) { this.setInteger64(value); }

  get infoToDouble(): number { return this.getDouble(); }
  set infoToDouble(value: number) { this.setDouble(value); }

  get infoToBoolean(): boolean { return this.getBoolean(); }
  set infoToBoolean(value: boolean) { this.setBoolean(value); }

  /** Name as a number, or its hash when it is not numeric (`Sub.ID`). */
  get id(): bigint {
    return tryParseInt64(this.name) ?? getHashCode(this.name);
  }
  set id(value: bigint) {
    this.name = value.toString();
  }

  /** The value viewed as a `key=value` dictionary. */
  get infos(): StringStructure {
    if (this._infos === null) {
      this._infos = new StringStructure(
        (x) => this._setRaw(x),
        () => this._raw,
      );
    }
    return this._infos;
  }

  // ---- loading ------------------------------------------------------------

  load(lps: string): void;
  load(name: string, info: string): void;
  load(nameOrLps: string, info?: string): void {
    if (info === undefined) {
      const p = nameOrLps.indexOf('#');
      if (p === -1) {
        this.name = nameOrLps;
        this._setStoreOnly('');
      } else {
        this.name = nameOrLps.substring(0, p);
        this._setStoreOnly(nameOrLps.substring(p + 1));
      }
    } else {
      this.name = nameOrLps;
      this._setStoreOnly(textReplace(info));
    }
  }

  /** Replace the value with a plain storage string (drops any typed value). */
  protected _setStoreOnly(store: string): void {
    this._obj = null;
    this._info = store;
    this._changed();
  }

  /** Copy name and value from another sub. */
  set(other: ISub): void {
    this.name = other.name;
    this._copyInfoFrom(other);
  }

  getInfo(): string { return this.infoDisplay; }

  /** The comma separated parts of the value, de-escaped, without empty parts. */
  getInfos(): string[] {
    const raw = this._raw;
    if (raw.length === 0) return [];
    const parts = raw.split(',');
    const result: string[] = [];
    for (const part of parts) if (part.length > 0) result.push(textDeReplace(part));
    return result;
  }

  first(): string | null {
    const infos = this.getInfos();
    return infos.length > 0 ? infos[0] : null;
  }

  last(): string | null {
    const infos = this.getInfos();
    return infos.length > 0 ? infos[infos.length - 1] : null;
  }

  // ---- identity -----------------------------------------------------------

  /** 64-bit content hash (wraps like unchecked C# `long` arithmetic). */
  getLongHashCode(): bigint {
    return wrapInt64(getHashCode(this.name) * 2n + getHashCode(this.getStoreString()) * 3n);
  }

  /** `GetHashCode()`: the low 32 bits of the long hash. */
  getHashCode(): number {
    return Number(BigInt.asIntN(32, this.getLongHashCode()));
  }

  equals(other: ISub | null | undefined): boolean {
    return !!other && other.getLongHashCode() === this.getLongHashCode();
  }

  compareTo(other: ISub | null | undefined): number {
    if (!other) return -1;
    const n = compareStrings(this.name, other.name);
    return n !== 0 ? n : compareStrings(this.infoDisplay, other.infoDisplay);
  }

  clone(): Sub {
    return new Sub(this);
  }

  toString(): string {
    const store = this.getStoreString();
    return store === '' ? this.name + ':|' : this.name + '#' + store + ':|';
  }

  // ---- static helpers of the C# class ------------------------------------

  static split(text: string, separator: string, count: number = -1): string[] {
    return splitLimited(text, separator, count);
  }

  static textReplace(text: string): string {
    return textReplace(text);
  }

  static textDeReplace(text: string): string {
    return textDeReplace(text);
  }

  static getHashCode(text: string): bigint {
    return getHashCode(text);
  }

  static getHashCode32(text: string): number {
    return getHashCode32(text);
  }
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
