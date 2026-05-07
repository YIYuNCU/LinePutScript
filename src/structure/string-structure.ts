import { FInt64 } from '../utils/fint64';
import { textReplace, textDeReplace } from '../utils/escaping';
import { splitLimited } from '../utils/parsing';

export class StringStructure {
  private setstr: (value: string) => void;
  private getstr: () => string;
  public single: boolean;
  private _cache: Map<string, string> | null = null;

  constructor(setstr: (value: string) => void, getstr: () => string, single: boolean = true) {
    this.setstr = setstr;
    this.getstr = getstr;
    this.single = single;
  }

  private get cache(): Map<string, string> {
    if (!this.single || this._cache === null) {
      this._cache = new Map();
      const raw = this.getstr();
      if (raw) {
        const pairs = splitLimited(raw, '/n');
        for (const pair of pairs) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx >= 0) {
            const key = pair.substring(0, eqIdx);
            const val = pair.substring(eqIdx + 1);
            this._cache.set(key, val);
          }
        }
      }
    }
    return this._cache;
  }

  private set cache(value: Map<string, string>) {
    const parts: string[] = [];
    for (const [key, val] of value) {
      parts.push(`${key}=${val}`);
    }
    this.setstr(parts.join('/n'));
  }

  getString(key: string, defaultValue?: string | null): string | null {
    if (this._cache?.has(key) ?? this.cache.has(key)) {
      return textDeReplace(this.cache.get(key)!).replace('/!n', '\n');
    }
    return defaultValue !== undefined ? defaultValue : null;
  }

  setString(key: string, value: string | null): void {
    const c = this.cache;
    if (value === null) {
      c.delete(key);
    } else {
      c.set(key, textReplace(value.replace('\n', '/!n')));
    }
    this.cache = c;
  }

  get(key: string): string {
    return this.getString(key) ?? '';
  }

  set(key: string, value: string): void {
    this.setString(key, value);
  }

  getBool(key: string, defaultValue: boolean = false): boolean {
    if (this.cache.has(key)) {
      const val = this.cache.get(key)!.toLowerCase();
      return val === 'true' || val === '1' || val === 't';
    }
    return defaultValue;
  }

  setBool(key: string, value: boolean): void {
    this.setString(key, value ? 'true' : 'false');
  }

  getInt(key: string, defaultValue: number = 0): number {
    if (this.cache.has(key)) {
      return parseInt(this.cache.get(key)!, 10) || 0;
    }
    return defaultValue;
  }

  setInt(key: string, value: number): void {
    this.setString(key, value.toString());
  }

  getInt64(key: string, defaultValue: bigint = 0n): bigint {
    if (this.cache.has(key)) {
      return BigInt(this.cache.get(key)!);
    }
    return defaultValue;
  }

  setInt64(key: string, value: bigint): void {
    this.setString(key, value.toString());
  }

  getFloat(key: string, defaultValue?: FInt64): FInt64 {
    if (this.cache.has(key)) {
      return FInt64.parse(this.cache.get(key)!);
    }
    return defaultValue ?? FInt64.Zero;
  }

  setFloat(key: string, value: FInt64): void {
    this.setString(key, value.toStoreString());
  }

  getDateTime(key: string, defaultValue?: Date): Date | null {
    if (this.cache.has(key)) {
      const raw = this.cache.get(key)!;
      const longMatch = /^-?\d+$/.test(raw);
      if (longMatch) {
        try {
          const ticks = BigInt(raw);
          const ticksPerMs = 10000n;
          const epochOffset = 621355968000000000n;
          const ms = Number((ticks - epochOffset) / ticksPerMs);
          return new Date(ms);
        } catch {
          return defaultValue ?? null;
        }
      }
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    return defaultValue ?? null;
  }

  setDateTime(key: string, value: Date): void {
    const ticksPerMs = 10000n;
    const epochOffset = 621355968000000000n;
    const ticks = BigInt(value.getTime()) * ticksPerMs + epochOffset;
    this.setString(key, ticks.toString());
  }

  getDouble(key: string, defaultValue: number = 0): number {
    if (this.cache.has(key)) {
      return parseFloat(this.cache.get(key)!) || 0;
    }
    return defaultValue;
  }

  setDouble(key: string, value: number): void {
    this.setString(key, value.toString());
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
    if (result) this.cache = c;
    return result;
  }

  [Symbol.iterator](): Iterator<[string, string]> {
    return this.cache.entries();
  }
}
