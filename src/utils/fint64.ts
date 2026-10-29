import { doubleToInt64, formatDouble, tryParseDouble, tryParseInt64, wrapInt64 } from './numeric';

const Anchor = 1_000_000_000n;
const Anchord = 1_000_000_000.0;
const LONG_MAX = 9223372036854775807n;
const LONG_MIN = -9223372036854775808n;
const NaNValue = LONG_MAX - 1n; // long.MaxValue - 1
const NegativeInfinityValue = LONG_MIN + 1n; // long.MinValue + 1
const PositiveInfinityValue = LONG_MAX; // long.MaxValue

/**
 * Fixed-precision decimal stored in a 64-bit integer (9 fractional digits).
 * Port of the C# `LinePutScript.FInt64` struct; all arithmetic wraps like an
 * unchecked `long`, and double conversions truncate toward zero.
 */
export class FInt64 {
  public readonly m_value: bigint;

  private constructor(value: bigint) {
    this.m_value = value;
  }

  /** `new FInt64(long)`: the raw underlying value (not scaled). */
  static fromLong(value: bigint): FInt64 {
    return new FInt64(wrapInt64(value));
  }

  /** `new FInt64(double)`: `(long)(value * Anchord)`. */
  static fromDouble(value: number): FInt64 {
    if (value !== value) return FInt64.NaN;
    if (value === Infinity) return FInt64.PositiveInfinity;
    if (value === -Infinity) return FInt64.NegativeInfinity;
    return new FInt64(doubleToInt64(value * Anchord));
  }

  static fromNumber(value: number): FInt64 {
    return FInt64.fromDouble(value);
  }

  /** `FromNumberInt` / `FromNumberLong`: the integer `value` itself (scaled by Anchor). */
  static fromInt(value: number | bigint): FInt64 {
    return new FInt64(wrapInt64(BigInt(value) * Anchor));
  }

  static fromObject(value: unknown): FInt64 {
    if (value instanceof FInt64) return value;
    if (typeof value === 'bigint') return new FInt64(wrapInt64(value));
    if (typeof value === 'number') {
      if (Number.isInteger(value) && Math.abs(value) < 9e15) return FInt64.fromInt(value);
      return FInt64.fromDouble(value);
    }
    if (typeof value === 'string') return FInt64.parse(value);
    return FInt64.NaN;
  }

  toDouble(): number {
    if (this.m_value === NaNValue) return NaN;
    return Number(this.m_value) / Anchord;
  }

  toStoreString(): string {
    return this.m_value.toString();
  }

  toString(): string {
    return formatDouble(this.toDouble());
  }

  isNaN(): boolean {
    return this.m_value === NaNValue;
  }

  isNegativeInfinity(): boolean {
    return this.m_value === NegativeInfinityValue;
  }

  isPositiveInfinity(): boolean {
    return this.m_value === PositiveInfinityValue;
  }

  isFinite(): boolean {
    const v = this.m_value;
    return v !== NaNValue && v !== NegativeInfinityValue && v !== PositiveInfinityValue;
  }

  isInfinity(): boolean {
    return this.isPositiveInfinity() || this.isNegativeInfinity();
  }

  isNegative(): boolean {
    return this.m_value < 0n;
  }

  isNormal(): boolean {
    return this.m_value !== 0n && this.isFinite();
  }

  toBoolean(): boolean {
    return this.m_value > Anchor;
  }

  toInt32(): number {
    return Math.trunc(this.toDouble()) || 0;
  }

  toInt64(): bigint {
    return this.m_value / Anchor;
  }

  // Arithmetic (unchecked 64-bit wrap-around, as in C#)
  add(other: FInt64): FInt64 {
    return new FInt64(wrapInt64(this.m_value + other.m_value));
  }

  sub(other: FInt64): FInt64 {
    return new FInt64(wrapInt64(this.m_value - other.m_value));
  }

  mul(other: FInt64): FInt64 {
    return new FInt64(wrapInt64((this.m_value / 1000n) * (other.m_value / 1000n)) / 1000n);
  }

  div(other: FInt64): FInt64 {
    return new FInt64(wrapInt64((wrapInt64(this.m_value * 100000n) / other.m_value) * 10000n));
  }

  addDouble(other: number): FInt64 {
    return new FInt64(wrapInt64(this.m_value + doubleToInt64(other * Anchord)));
  }

  subDouble(other: number): FInt64 {
    return new FInt64(wrapInt64(this.m_value - doubleToInt64(other * Anchord)));
  }

  mulDouble(other: number): FInt64 {
    return new FInt64(doubleToInt64(Number(this.m_value) * other));
  }

  divDouble(other: number): FInt64 {
    return new FInt64(doubleToInt64(Number(this.m_value) / other));
  }

  negate(): FInt64 {
    return new FInt64(wrapInt64(-this.m_value));
  }

  increment(): FInt64 {
    return new FInt64(wrapInt64(this.m_value + Anchor));
  }

  decrement(): FInt64 {
    return new FInt64(wrapInt64(this.m_value - Anchor));
  }

  // Bitwise
  and(other: FInt64): FInt64 {
    return new FInt64(this.m_value & other.m_value);
  }

  or(other: FInt64): FInt64 {
    return new FInt64(this.m_value | other.m_value);
  }

  xor(other: FInt64): FInt64 {
    return new FInt64(this.m_value ^ other.m_value);
  }

  not(): FInt64 {
    return new FInt64(~this.m_value);
  }

  // Comparison. The raw operators (< > <= >=) compare m_value, so NaN is simply
  // the second largest long here, exactly as with the C# operators.
  lt(other: FInt64): boolean {
    return this.m_value < other.m_value;
  }

  gt(other: FInt64): boolean {
    return this.m_value > other.m_value;
  }

  le(other: FInt64): boolean {
    return this.m_value <= other.m_value;
  }

  ge(other: FInt64): boolean {
    return this.m_value >= other.m_value;
  }

  compareTo(other: FInt64): number {
    if (this.isNaN()) return -1;
    if (other.isNaN()) return 1;
    if (this.m_value < other.m_value) return -1;
    if (this.m_value > other.m_value) return 1;
    return 0;
  }

  /** `Equals`: NaN is never equal to anything (the `==` operator would compare raw values). */
  equals(other: FInt64): boolean {
    if (this.isNaN() || other.isNaN()) return false;
    return this.m_value === other.m_value;
  }

  /**
   * FInt64.Parse: a plain integer is taken as the raw underlying value (the store
   * format), anything else goes through double parsing; unparsable text is NaN.
   */
  static parse(s: string): FInt64 {
    if (s === null || s === undefined) return FInt64.NaN;
    const raw = tryParseInt64(s);
    if (raw !== null) return new FInt64(raw);
    const d = tryParseDouble(s);
    if (d !== null) return FInt64.fromDouble(d);
    return FInt64.NaN;
  }

  static tryParse(s: string | null | undefined): { result: FInt64; success: boolean } {
    if (s === null || s === undefined) return { result: FInt64.Zero, success: false };
    const parsed = FInt64.parse(s);
    if (parsed.isNaN()) return { result: FInt64.Zero, success: false };
    return { result: parsed, success: true };
  }

  // Constants
  static readonly Anchor = Anchor;
  static readonly Anchord = Anchord;
  static readonly MinValue = new FInt64(LONG_MIN);
  static readonly MaxValue = new FInt64(LONG_MAX);
  static readonly NaN = new FInt64(NaNValue);
  static readonly NegativeInfinity = new FInt64(NegativeInfinityValue);
  static readonly PositiveInfinity = new FInt64(PositiveInfinityValue);
  static readonly Zero = new FInt64(0n);
  static readonly One = new FInt64(Anchor);
  static readonly NegativeOne = new FInt64(-Anchor);
  static readonly NegativeZero = new FInt64(0n);
  static readonly E = new FInt64(doubleToInt64(Math.E * Anchord));
  static readonly Pi = new FInt64(doubleToInt64(Math.PI * Anchord));
  static readonly AdditiveIdentity = new FInt64(0n);
  static readonly MultiplicativeIdentity = new FInt64(Anchor);

  // Static helpers
  static isFinite(d: FInt64): boolean { return d.isFinite(); }
  static isInfinity(d: FInt64): boolean { return d.isInfinity(); }
  static isNaNStatic(d: FInt64): boolean { return d.isNaN(); }
  static isNegative(d: FInt64): boolean { return d.isNegative(); }
  static isNormal(d: FInt64): boolean { return d.isNormal(); }
}
