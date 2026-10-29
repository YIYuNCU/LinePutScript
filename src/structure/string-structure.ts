import { FInt64 } from '../utils/fint64';
import { textReplace, textDeReplace } from '../utils/escaping';
import { dateToTicks, formatDouble, ticksToDate, minDate } from '../utils/numeric';
import { strToBool, strToDate, strToDouble, strToInt, strToInt64 } from './set-object';

const NEWLINE_RE = /\n/g;
const ESCAPED_NEWLINE_RE = /\/!n/g;

/**
 * A `key=value` dictionary stored inside one string, entries separated by "/n"
 * (every entry, including the last one, is terminated by "/n", as in the C#
 * original). Used for `Sub.infos` and `Line.texts`.
 */
export class StringStructure {
  private setstr: (value: string) => void;
  private getstr: () => string;
  /** When true the parsed dictionary is cached; when false it is re-parsed on every access. */
  public single: boolean;
  private _cache: Map<string, string> | null = null;

  constructor(setstr: (value: string) => void, getstr: () => string, single: boolean = true) {
    this.setstr = setstr;
    this.getstr = getstr;
    this.single = single;
  }

  /** Drop the parsed cache (called when the underlying string was replaced from outside). */
  invalidate(): void {
    this._cache = null;
  }

  private get cache(): Map<string, string> {
    if (!this.single || this._cache === null) {
      const map = new Map<string, string>();
      const raw = this.getstr();
      let pos = 0;
      const len = raw.length;
      while (pos < len) {
        let end = raw.indexOf('/n', pos);
        if (end === -1) end = len;
        const eq = raw.indexOf('=', pos);
        if (eq !== -1 && eq < end) map.set(raw.substring(pos, eq), raw.substring(eq + 1, end));
        pos = end + 2;
      }
      this._cache = map;
    }
    return this._cache;
  }

  private write(map: Map<string, string>): void {
    let out = '';
    for (const [key, val] of map) out += key + '=' + val + '/n';
    this.setstr(out);
  }

  private raw(key: string): string | undefined {
    return this.cache.get(key);
  }

  getString(key: string, defaultValue?: string | null): string | null {
    const raw = this.raw(key);
    if (raw !== undefined) return textDeReplace(raw).replace(ESCAPED_NEWLINE_RE, '\n');
    return defaultValue !== undefined ? defaultValue : null;
  }

  setString(key: string, value: string | null): void {
    const c = this.cache;
    if (value === null) c.delete(key);
    else c.set(key, textReplace(value.replace(NEWLINE_RE, '/!n')));
    this.write(c);
  }

  /** Dictionary-style add: the value is escaped but newlines are not specially encoded. */
  add(key: string, value: string | null): void {
    const c = this.cache;
    if (value === null) c.delete(key);
    else c.set(key, textReplace(value));
    this.write(c);
  }

  get(key: string): string {
    return this.getString(key) ?? '';
  }

  set(key: string, value: string): void {
    this.setString(key, value);
  }

  getBool(key: string, defaultValue: boolean = false): boolean {
    const raw = this.raw(key);
    return raw !== undefined ? strToBool(raw) : defaultValue;
  }

  setBool(key: string, value: boolean): void {
    this.setString(key, value ? 'true' : 'false');
  }

  getInt(key: string, defaultValue: number = 0): number {
    const raw = this.raw(key);
    return raw !== undefined ? strToInt(raw) : defaultValue;
  }

  setInt(key: string, value: number): void {
    this.setString(key, String(Math.trunc(value)));
  }

  getInt64(key: string, defaultValue: bigint = 0n): bigint {
    const raw = this.raw(key);
    return raw !== undefined ? strToInt64(raw) : defaultValue;
  }

  setInt64(key: string, value: bigint): void {
    this.setString(key, value.toString());
  }

  getFloat(key: string, defaultValue?: FInt64): FInt64 {
    const raw = this.raw(key);
    if (raw !== undefined) return FInt64.parse(raw);
    return defaultValue ?? FInt64.Zero;
  }

  setFloat(key: string, value: FInt64): void {
    this.setString(key, value.toStoreString());
  }

  /** DateTime stored as ticks; missing keys give `defaultValue` or DateTime.MinValue. */
  getDateTime(key: string, defaultValue?: Date): Date {
    const raw = this.raw(key);
    if (raw !== undefined) return strToDate(raw);
    return defaultValue ?? minDate();
  }

  setDateTime(key: string, value: Date): void {
    this.setString(key, dateToTicks(value).toString());
  }

  getDouble(key: string, defaultValue: number = 0): number {
    const raw = this.raw(key);
    return raw !== undefined ? strToDouble(raw) : defaultValue;
  }

  setDouble(key: string, value: number): void {
    this.setString(key, formatDouble(value));
  }

  containsKey(key: string): boolean {
    return this.cache.has(key);
  }

  get keys(): string[] {
    return Array.from(this.cache.keys());
  }

  get values(): string[] {
    return Array.from(this.cache.values());
  }

  get count(): number {
    return this.cache.size;
  }

  clear(): void {
    this._cache = null;
    this.setstr('');
  }

  remove(key: string): boolean {
    const c = this.cache;
    const result = c.delete(key);
    this.write(c);
    return result;
  }

  [Symbol.iterator](): Iterator<[string, string]> {
    return this.cache.entries();
  }
}
