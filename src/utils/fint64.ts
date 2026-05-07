const Anchor = 1_000_000_000n;
const Anchord = 1_000_000_000.0;
const NaNValue = 9223372036854775807n - 1n; // long.MaxValue - 1
const NegativeInfinityValue = -9223372036854775807n + 1n; // long.MinValue + 1
const PositiveInfinityValue = 9223372036854775807n; // long.MaxValue

export class FInt64 {
  public readonly m_value: bigint;

  private constructor(value: bigint) {
    this.m_value = value;
  }

  static fromLong(value: bigint): FInt64 {
    return new FInt64(value);
  }

  static fromDouble(value: number): FInt64 {
    return new FInt64(BigInt(Math.round(value * Anchord)));
  }

  static fromNumber(value: number): FInt64 {
    return FInt64.fromDouble(value);
  }

  static fromInt(value: number): FInt64 {
    return new FInt64(BigInt(value) * Anchor);
  }

  static fromObject(value: unknown): FInt64 {
    if (value instanceof FInt64) return value;
    if (typeof value === 'bigint') return new FInt64(value);
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return FInt64.fromInt(value);
      return FInt64.fromDouble(value);
    }
    if (typeof value === 'string') return FInt64.parse(value);
    return FInt64.NaN;
  }

  toDouble(): number {
    if (this.isNaN()) return NaN;
    return Number(this.m_value) / Anchord;
  }

  toStoreString(): string {
    return this.m_value.toString();
  }

  toString(): string {
    return this.toDouble().toString();
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
    return !this.isNaN() && !this.isNegativeInfinity() && !this.isPositiveInfinity();
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
    return Math.trunc(this.toDouble());
  }

  toInt64(): bigint {
    return this.m_value / Anchor;
  }

  // Arithmetic
  add(other: FInt64): FInt64 {
    return new FInt64(this.m_value + other.m_value);
  }

  sub(other: FInt64): FInt64 {
    return new FInt64(this.m_value - other.m_value);
  }

  mul(other: FInt64): FInt64 {
    return new FInt64(this.m_value / 1000n * (other.m_value / 1000n) / 1000n);
  }

  div(other: FInt64): FInt64 {
    return new FInt64(this.m_value * 100000n / other.m_value * 10000n);
  }

  addDouble(other: number): FInt64 {
    return new FInt64(this.m_value + BigInt(Math.round(other * Anchord)));
  }

  subDouble(other: number): FInt64 {
    return new FInt64(this.m_value - BigInt(Math.round(other * Anchord)));
  }

  mulDouble(other: number): FInt64 {
    return new FInt64(BigInt(Math.round(Number(this.m_value) * other)));
  }

  divDouble(other: number): FInt64 {
    return new FInt64(BigInt(Math.round(Number(this.m_value) / other)));
  }

  negate(): FInt64 {
    return new FInt64(-this.m_value);
  }

  increment(): FInt64 {
    return new FInt64(this.m_value + Anchor);
  }

  decrement(): FInt64 {
    return new FInt64(this.m_value - Anchor);
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

  // Comparison
  compareTo(other: FInt64): number {
    if (this.isNaN()) return -1;
    if (other.isNaN()) return 1;
    if (this.m_value < other.m_value) return -1;
    if (this.m_value > other.m_value) return 1;
    return 0;
  }

  equals(other: FInt64): boolean {
    if (this.isNaN() || other.isNaN()) return false;
    return this.m_value === other.m_value;
  }

  // Parse
  static parse(s: string): FInt64 {
    if (s === null || s === undefined) return FInt64.NaN;
    // Try parsing as raw long value first (store string format)
    const longMatch = /^-?\d+$/.test(s);
    if (longMatch) {
      try {
        const bi = BigInt(s);
        return new FInt64(bi);
      } catch {
        // fall through
      }
    }
    // Try as double
    const d = Number(s);
    if (!isNaN(d)) {
      return FInt64.fromDouble(d);
    }
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
  static readonly MinValue = new FInt64(-9223372036854775807n - 1n);
  static readonly MaxValue = new FInt64(9223372036854775807n);
  static readonly NaN = new FInt64(NaNValue);
  static readonly NegativeInfinity = new FInt64(NegativeInfinityValue);
  static readonly PositiveInfinity = new FInt64(PositiveInfinityValue);
  static readonly Zero = new FInt64(0n);
  static readonly One = new FInt64(Anchor);
  static readonly NegativeOne = FInt64.fromDouble(-1.0);
  static readonly AdditiveIdentity = new FInt64(0n);
  static readonly MultiplicativeIdentity = new FInt64(Anchor);

  // Static helpers
  static isFinite(d: FInt64): boolean { return d.isFinite(); }
  static isInfinity(d: FInt64): boolean { return d.isInfinity(); }
  static isNaNStatic(d: FInt64): boolean { return d.isNaN(); }
  static isNegative(d: FInt64): boolean { return d.isNegative(); }
  static isNormal(d: FInt64): boolean { return d.isNormal(); }
}
