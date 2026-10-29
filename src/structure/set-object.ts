import { FInt64 } from '../utils/fint64';
import {
  dateToTicks,
  doubleToInt32,
  doubleToInt64,
  formatDateTime,
  formatDouble,
  maxDate,
  minDate,
  tryParseDateStrict,
  tryParseDouble,
  tryParseInt32,
  tryParseInt64,
  ticksToDate,
  wrapInt32,
} from '../utils/numeric';

/** Value kinds a {@link SetObject} can hold (the C# original keeps the CLR type). */
export const SetObjectKind = {
  String: 0,
  Int: 1,
  Long: 2,
  Double: 3,
  Float: 4,
  Boolean: 5,
  DateTime: 6,
} as const;
export type SetObjectKind = (typeof SetObjectKind)[keyof typeof SetObjectKind];

export type SetObjectValue = string | number | bigint | boolean | Date | FInt64;

// ---------------------------------------------------------------------------
// string -> typed conversions (the "strTo*" converters of the C# SetObject).
// Used directly by Sub so values parsed from text never need a SetObject.
// ---------------------------------------------------------------------------

/** int: int.TryParse, then long (wrapped), then double (truncated), then a date's ticks; else 0. */
export function strToInt(text: string): number {
  const i = tryParseInt32(text);
  if (i !== null) return i;
  const l = tryParseInt64(text);
  if (l !== null) return wrapInt32(l);
  const d = tryParseDouble(text);
  if (d !== null) return doubleToInt32(d);
  const date = tryParseDateStrict(text);
  return date === null ? 0 : wrapInt32(dateToTicks(date));
}

/** long: long.TryParse, then double (truncated), then a date's ticks; else 0. */
export function strToInt64(text: string): bigint {
  const l = tryParseInt64(text);
  if (l !== null) return l;
  const d = tryParseDouble(text);
  if (d !== null) return doubleToInt64(d);
  const date = tryParseDateStrict(text);
  return date === null ? 0n : dateToTicks(date);
}

export function strToDouble(text: string): number {
  return tryParseDouble(text) ?? 0;
}

/** DateTime: ticks as long, `yyyy-MM-dd HH:mm:ss` (and similar), else DateTime.MinValue. */
export function strToDate(text: string): Date {
  const l = tryParseInt64(text);
  if (l !== null) return ticksToDate(l);
  const d = tryParseDateStrict(text);
  if (d !== null) return d;
  const ms = /\d/.test(text) ? Date.parse(text) : NaN;
  return ms === ms ? new Date(ms) : minDate();
}

export function strToBool(text: string): boolean {
  const len = text.length;
  if (len === 0 || len > 4) return false;
  const t = text.toLowerCase();
  return t === 'true' || t === '1' || t === 't';
}

/**
 * Holds one value of any supported kind and converts between kinds on demand
 * (port of the C# `SetObject`). Setting and getting the same kind never goes
 * through text, which is where the original gets its speed.
 */
export class SetObject {
  public kind: SetObjectKind;
  public value: SetObjectValue;

  constructor(value: SetObjectValue = '') {
    this.kind = SetObjectKind.String;
    this.value = '';
    this.setValue(value);
  }

  static fromString(value: string): SetObject {
    return new SetObject(value);
  }
  static fromInt(value: number): SetObject {
    const o = new SetObject();
    o.setInteger(value);
    return o;
  }
  static fromInt64(value: bigint): SetObject {
    const o = new SetObject();
    o.setInteger64(value);
    return o;
  }
  static fromDouble(value: number): SetObject {
    const o = new SetObject();
    o.setDouble(value);
    return o;
  }
  static fromFloat(value: FInt64): SetObject {
    const o = new SetObject();
    o.setFloat(value);
    return o;
  }
  static fromBoolean(value: boolean): SetObject {
    const o = new SetObject();
    o.setBoolean(value);
    return o;
  }
  static fromDateTime(value: Date): SetObject {
    const o = new SetObject();
    o.setDateTime(value);
    return o;
  }

  /** Store a value, inferring the kind from its JS type (integers become Int/Long, other numbers Double). */
  setValue(value: SetObjectValue): void {
    if (typeof value === 'string') this.setString(value);
    else if (typeof value === 'boolean') this.setBoolean(value);
    else if (typeof value === 'bigint') this.setInteger64(value);
    else if (value instanceof Date) this.setDateTime(value);
    else if (value instanceof FInt64) this.setFloat(value);
    else if (Number.isInteger(value) && Math.abs(value) <= 2147483647) this.setInteger(value);
    else if (Number.isSafeInteger(value)) this.setInteger64(BigInt(value));
    else this.setDouble(value);
  }

  clone(): SetObject {
    const o = new SetObject();
    o.kind = this.kind;
    o.value = this.kind === SetObjectKind.DateTime ? new Date((this.value as Date).getTime()) : this.value;
    return o;
  }

  // ---- setters ------------------------------------------------------------
  setString(value: string): void {
    this.kind = SetObjectKind.String;
    this.value = value;
  }
  setInteger(value: number): void {
    this.kind = SetObjectKind.Int;
    this.value = doubleToInt32(value);
  }
  setInteger64(value: bigint): void {
    this.kind = SetObjectKind.Long;
    this.value = BigInt.asIntN(64, value);
  }
  setDouble(value: number): void {
    this.kind = SetObjectKind.Double;
    this.value = value;
  }
  setFloat(value: FInt64): void {
    this.kind = SetObjectKind.Float;
    this.value = value;
  }
  setBoolean(value: boolean): void {
    this.kind = SetObjectKind.Boolean;
    this.value = value;
  }
  setDateTime(value: Date): void {
    this.kind = SetObjectKind.DateTime;
    this.value = new Date(value.getTime());
  }

  // ---- getters ------------------------------------------------------------

  /** The text written to a file: numbers as text, bool as True/False, DateTime as ticks, FInt64 as its raw long. */
  getStoreString(): string {
    switch (this.kind) {
      case SetObjectKind.String:
        return this.value as string;
      case SetObjectKind.Double:
        return formatDouble(this.value as number);
      case SetObjectKind.Float:
        return (this.value as FInt64).toStoreString();
      case SetObjectKind.Boolean:
        return (this.value as boolean) ? 'True' : 'False';
      case SetObjectKind.DateTime:
        return dateToTicks(this.value as Date).toString();
      default:
        return String(this.value);
    }
  }

  /** The human readable text: like the store string, but DateTime is `yyyy-MM-dd HH:mm:ss` and FInt64 its decimal value. */
  getString(): string {
    switch (this.kind) {
      case SetObjectKind.Float:
        return (this.value as FInt64).toString();
      case SetObjectKind.DateTime:
        return formatDateTime(this.value as Date);
      default:
        return this.getStoreString();
    }
  }

  getInteger(): number {
    const v = this.value;
    switch (this.kind) {
      case SetObjectKind.String:
        return strToInt(v as string);
      case SetObjectKind.Int:
        return v as number;
      case SetObjectKind.Long:
        return wrapInt32(v as bigint);
      case SetObjectKind.Double:
        return doubleToInt32(v as number);
      case SetObjectKind.Float:
        return doubleToInt32((v as FInt64).toDouble());
      case SetObjectKind.Boolean:
        return v ? 1 : 0;
      default:
        return wrapInt32(dateToTicks(v as Date));
    }
  }

  getInteger64(): bigint {
    const v = this.value;
    switch (this.kind) {
      case SetObjectKind.String:
        return strToInt64(v as string);
      case SetObjectKind.Int:
        return BigInt(v as number);
      case SetObjectKind.Long:
        return v as bigint;
      case SetObjectKind.Double:
        return doubleToInt64(v as number);
      case SetObjectKind.Float:
        return doubleToInt64((v as FInt64).toDouble());
      case SetObjectKind.Boolean:
        return v ? 1n : 0n;
      default:
        return dateToTicks(v as Date);
    }
  }

  getDouble(): number {
    const v = this.value;
    switch (this.kind) {
      case SetObjectKind.String:
        return strToDouble(v as string);
      case SetObjectKind.Int:
      case SetObjectKind.Double:
        return v as number;
      case SetObjectKind.Long:
        return Number(v as bigint);
      case SetObjectKind.Float:
        return (v as FInt64).toDouble();
      case SetObjectKind.Boolean:
        return v ? 1 : 0;
      default:
        return Number(dateToTicks(v as Date));
    }
  }

  getFloat(): FInt64 {
    const v = this.value;
    switch (this.kind) {
      case SetObjectKind.String:
        return FInt64.parse(v as string);
      case SetObjectKind.Int:
      case SetObjectKind.Double:
        return FInt64.fromDouble(v as number);
      case SetObjectKind.Long:
        return FInt64.fromDouble(Number(v as bigint));
      case SetObjectKind.Float:
        return v as FInt64;
      case SetObjectKind.Boolean:
        return v ? FInt64.One : FInt64.Zero;
      default:
        return FInt64.fromDouble(Number(dateToTicks(v as Date)));
    }
  }

  getDateTime(): Date {
    const v = this.value;
    switch (this.kind) {
      case SetObjectKind.String:
        return strToDate(v as string);
      case SetObjectKind.Int:
        return ticksToDate(BigInt(v as number));
      case SetObjectKind.Long:
        return ticksToDate(v as bigint);
      case SetObjectKind.Double:
        return ticksToDate(doubleToInt64(v as number));
      case SetObjectKind.Float:
        return ticksToDate(doubleToInt64((v as FInt64).toDouble()));
      case SetObjectKind.Boolean:
        return v ? maxDate() : minDate();
      default:
        return new Date((v as Date).getTime());
    }
  }

  getBoolean(): boolean {
    const v = this.value;
    switch (this.kind) {
      case SetObjectKind.String:
        return strToBool(v as string);
      case SetObjectKind.Int:
      case SetObjectKind.Double:
        return (v as number) >= 1;
      case SetObjectKind.Long:
        return (v as bigint) >= 1n;
      case SetObjectKind.Float:
        return (v as FInt64).toBoolean();
      case SetObjectKind.Boolean:
        return v as boolean;
      default:
        return dateToTicks(v as Date) >= 1n;
    }
  }

  // ---- comparison ---------------------------------------------------------

  /** Equal when the store strings match (a number and its text compare equal). */
  equals(other: SetObject | string | number | bigint | boolean | Date | FInt64): boolean {
    if (other instanceof SetObject) return this.getStoreString() === other.getStoreString();
    if (typeof other === 'string') return this.getString() === other || this.getStoreString() === other;
    if (typeof other === 'boolean') return this.getBoolean() === other;
    if (typeof other === 'bigint') return this.getInteger64() === other;
    if (typeof other === 'number') return Number.isInteger(other) ? this.getInteger64() === BigInt(other) : this.getDouble() === other;
    if (other instanceof Date) return this.getDateTime().getTime() === other.getTime();
    return this.getFloat().equals(other);
  }

  compareTo(other: SetObject): number {
    const a = this.getStoreString();
    const b = other.getStoreString();
    return a < b ? -1 : a > b ? 1 : 0;
  }

  toString(): string {
    return this.getString();
  }
}
