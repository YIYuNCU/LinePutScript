import { ISub } from '../types/interfaces';
import * as esc from '../utils/escaping';
import { getHashCode } from '../utils/hashing';
import { FInt64 } from '../utils/fint64';
import { splitLimited } from '../utils/parsing';
import { StringStructure } from '../structure/string-structure';

export class Sub implements ISub {
  public name: string;
  protected _info: string;

  constructor();
  constructor(lpsSub: string);
  constructor(name: string, info: string);
  constructor(name: string, ...infos: string[]);
  constructor(nameOrLps?: string, infoOrSecond?: string, ...rest: string[]) {
    if (nameOrLps === undefined) {
      this.name = '';
      this._info = '';
    } else if (infoOrSecond === undefined && rest.length === 0) {
      this.name = '';
      this._info = '';
      this.load(nameOrLps);
    } else {
      this.name = nameOrLps;
      if (rest.length > 0) {
        const allInfos = [infoOrSecond ?? '', ...rest];
        const joined = allInfos.map(s => esc.textReplace(s)).join(',');
        this._info = joined;
      } else {
        this._info = esc.textReplace(infoOrSecond ?? '');
      }
    }
  }

  getStoreString(): string { return this._info; }

  getString(): string { return this.infoDisplay; }

  getInteger64(): bigint { return BigInt(this._info || '0'); }

  getInteger(): number { return parseInt(this._info, 10) || 0; }

  getDouble(): number { return parseFloat(this._info) || 0; }

  getFloat(): FInt64 { return FInt64.parse(this._info); }

  getDateTime(): Date {
    const longMatch = /^-?\d+$/.test(this._info);
    if (longMatch) {
      try {
        const ticks = BigInt(this._info);
        const ticksPerMs = 10000n;
        const epochOffset = 621355968000000000n;
        const ms = Number((ticks - epochOffset) / ticksPerMs);
        return new Date(ms);
      } catch {
        return new Date(0);
      }
    }
    const d = new Date(this._info);
    if (!isNaN(d.getTime())) return d;
    return new Date(0);
  }

  getBoolean(): boolean {
    const lower = this._info.toLowerCase();
    return lower === 'true' || lower === 't' || lower === '1';
  }

  setString(value: string): void { this._info = esc.textReplace(value); }
  setInteger(value: number): void { this._info = value.toString(); }
  setInteger64(value: bigint): void { this._info = value.toString(); }
  setDouble(value: number): void { this._info = value.toString(); }
  setFloat(value: FInt64): void { this._info = value.toStoreString(); }
  setDateTime(value: Date): void {
    const ticksPerMs = 10000n;
    const epochOffset = 621355968000000000n;
    const ticks = BigInt(value.getTime()) * ticksPerMs + epochOffset;
    this._info = ticks.toString();
  }
  setBoolean(value: boolean): void { this._info = value ? 'True' : 'False'; }

  get info(): string { return this._info; }
  set info(value: string) { this._info = value; }

  get infoDisplay(): string { return esc.textDeReplace(this._info); }
  set infoDisplay(value: string) { this._info = esc.textReplace(value); }

  get infoToInt(): number { return this.getInteger(); }
  set infoToInt(value: number) { this.setInteger(value); }

  get infoToInt64(): bigint { return this.getInteger64(); }
  set infoToInt64(value: bigint) { this.setInteger64(value); }

  get infoToDouble(): number { return this.getDouble(); }
  set infoToDouble(value: number) { this.setDouble(value); }

  get infoToBoolean(): boolean { return this.getBoolean(); }
  set infoToBoolean(value: boolean) { this.setBoolean(value); }

  private _infos: StringStructure | null = null;

  get infos(): StringStructure {
    if (!this._infos) {
      this._infos = new StringStructure(
        (x) => { this._info = x; },
        () => this._info,
      );
    }
    return this._infos;
  }

  load(lps: string): void;
  load(name: string, info: string): void;
  load(nameOrLps: string, info?: string): void {
    if (info === undefined) {
      const st = splitLimited(nameOrLps, '#', 1);
      this.name = st[0];
      this._info = st.length > 1 ? st[1] : '';
    } else {
      this.name = nameOrLps;
      this._info = esc.textReplace(info);
    }
  }

  set(other: ISub): void {
    this.name = other.name;
    this._info = other.info;
  }

  getInfo(): string { return this.infoDisplay; }

  getInfos(): string[] {
    if (!this._info) return [];
    return this._info.split(',').filter(x => x.length > 0).map(s => esc.textDeReplace(s));
  }

  first(): string | null {
    const infos = this.getInfos();
    return infos.length > 0 ? infos[0] : null;
  }

  last(): string | null {
    const infos = this.getInfos();
    return infos.length > 0 ? infos[infos.length - 1] : null;
  }

  getLongHashCode(): bigint {
    return getHashCode(this.name) * 2n + getHashCode(this._info) * 3n;
  }

  toString(): string {
    if (!this._info) return `${this.name}:|`;
    return `${this.name}#${this._info}:|`;
  }

  static split(text: string, separator: string, count: number = -1): string[] {
    return splitLimited(text, separator, count);
  }
}
