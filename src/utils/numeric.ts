// Helpers that reproduce the .NET numeric / date conversion rules used by the
// original C# SetObject (int.TryParse, double.TryParse, (int)double casts,
// double.ToString(), DateTime ticks ...). Internal: not re-exported publicly.

export const INT64_MAX = 9223372036854775807n;
export const INT64_MIN = -9223372036854775808n;
const INT32_MAX = 2147483647;
const INT32_MIN = -2147483648;
const TWO_POW_63 = 9223372036854775808; // exactly representable as a double

/** Wrap a bigint to the signed 64-bit range (C# unchecked arithmetic). */
export function wrapInt64(value: bigint): bigint {
  return BigInt.asIntN(64, value);
}

/** (int)longValue in an unchecked context. */
export function wrapInt32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}

/** (long)doubleValue: truncates toward zero, saturates, NaN becomes 0. */
export function doubleToInt64(value: number): bigint {
  if (value !== value) return 0n;
  if (value >= TWO_POW_63) return INT64_MAX;
  if (value <= -TWO_POW_63) return INT64_MIN;
  return BigInt(Math.trunc(value));
}

/** (int)doubleValue: truncates toward zero, saturates, NaN becomes 0. */
export function doubleToInt32(value: number): number {
  if (value !== value) return 0;
  if (value >= INT32_MAX) return INT32_MAX;
  if (value <= INT32_MIN) return INT32_MIN;
  return Math.trunc(value) || 0; // `|| 0` normalises -0
}

const INT_RE = /^[+-]?\d+$/;

/** Digits-only (optionally signed) text of up to 15 digits as a number, else null. */
function parseShortInt(text: string): number | null {
  const len = text.length;
  if (len === 0 || len > 16) return null;
  const first = text.charCodeAt(0);
  let i = 0;
  let negative = false;
  if (first === 45 || first === 43) {
    if (len === 1) return null;
    negative = first === 45;
    i = 1;
  }
  if (len - i > 15) return null;
  let n = 0;
  for (; i < len; i++) {
    const c = text.charCodeAt(i) - 48;
    if (c < 0 || c > 9) return null;
    n = n * 10 + c;
  }
  return negative && n !== 0 ? -n : n;
}

/** long.TryParse(string): optional surrounding white space and a leading sign. */
export function tryParseInt64(text: string): bigint | null {
  const short = parseShortInt(text);
  if (short !== null) return BigInt(short);
  const t = text.trim();
  if (!INT_RE.test(t)) return null;
  const v = BigInt(t.charCodeAt(0) === 43 ? t.substring(1) : t);
  return v >= INT64_MIN && v <= INT64_MAX ? v : null;
}

/** int.TryParse(string). */
export function tryParseInt32(text: string): number | null {
  const short = parseShortInt(text);
  if (short !== null) return short >= INT32_MIN && short <= INT32_MAX ? short : null;
  const v = tryParseInt64(text);
  if (v === null || v < -2147483648n || v > 2147483647n) return null;
  return Number(v);
}

const DOUBLE_RE = /^[+-]?(?:\d+(?:,\d+)*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const SPECIAL_RE = /^([+-]?)(?:(infinity)|(nan))$/i;

/** double.TryParse(string) with NumberStyles.Float | AllowThousands, invariant culture. */
export function tryParseDouble(text: string): number | null {
  const t = text.trim();
  if (t.length === 0) return null;
  if (DOUBLE_RE.test(t)) {
    return Number(t.indexOf(',') === -1 ? t : t.replace(/,/g, ''));
  }
  const m = SPECIAL_RE.exec(t);
  if (m === null) return null;
  if (m[3] !== undefined) return NaN;
  return m[1] === '-' ? -Infinity : Infinity;
}

/**
 * double.ToString() of .NET Core 3.0+ (shortest round-trip, invariant culture):
 * scientific notation is used when the decimal exponent is >= 15 or <= -5.
 */
export function formatDouble(value: number): string {
  if (value !== value) return 'NaN';
  if (value === Infinity) return 'Infinity';
  if (value === -Infinity) return '-Infinity';
  if (value === 0) return Object.is(value, -0) ? '-0' : '0';
  const abs = Math.abs(value);
  // Fast path: the JS shortest representation already matches .NET in this range.
  if (abs >= 1e-4 && abs < 1e15) return String(value);
  const m = /^(-?)(\d)(?:\.(\d+))?e([+-])(\d+)$/.exec(value.toExponential());
  if (m === null) return String(value);
  const sign = m[1];
  const digits = m[2] + (m[3] ?? '');
  const exp = Number(m[5]) * (m[4] === '-' ? -1 : 1);
  if (exp >= 15 || exp < -4) {
    const mantissa = m[2] + (m[3] !== undefined ? '.' + m[3] : '');
    const e = Math.abs(exp);
    return `${sign}${mantissa}E${exp < 0 ? '-' : '+'}${e < 10 ? '0' + e : e}`;
  }
  if (exp >= 0) {
    return sign + (digits.length <= exp + 1 ? digits + '0'.repeat(exp + 1 - digits.length) : digits.substring(0, exp + 1) + '.' + digits.substring(exp + 1));
  }
  return sign + '0.' + '0'.repeat(-exp - 1) + digits;
}

// ---------------------------------------------------------------------------
// DateTime <-> ticks. A .NET DateTime is a count of 100ns ticks since 0001-01-01.
// A JS Date carries the same wall-clock value, interpreted as UTC.
// ---------------------------------------------------------------------------

export const EPOCH_TICKS = 621355968000000000n; // ticks at 1970-01-01
const MAX_TICKS = 3155378975999999999n; // DateTime.MaxValue
const TICKS_PER_MS = 10000n;
export const MIN_DATE_MS = -62135596800000; // DateTime.MinValue
export const MAX_DATE_MS = 253402300799999; // DateTime.MaxValue (ms precision)

export function minDate(): Date {
  return new Date(MIN_DATE_MS);
}

export function maxDate(): Date {
  return new Date(MAX_DATE_MS);
}

export function dateToTicks(date: Date): bigint {
  const ms = date.getTime();
  if (ms !== ms) return 0n;
  if (ms <= MIN_DATE_MS) return 0n;
  if (ms >= MAX_DATE_MS) return MAX_TICKS;
  return BigInt(ms) * TICKS_PER_MS + EPOCH_TICKS;
}

export function ticksToDate(ticks: bigint): Date {
  if (ticks <= 0n) return new Date(MIN_DATE_MS);
  if (ticks >= MAX_TICKS) return new Date(MAX_DATE_MS);
  const delta = ticks - EPOCH_TICKS;
  let ms = delta / TICKS_PER_MS;
  if (delta % TICKS_PER_MS < 0n) ms -= 1n; // floor division
  return new Date(Number(ms));
}

function pad(n: number, width: number): string {
  const s = String(n);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

/** DateTime.ToString("yyyy-MM-dd HH:mm:ss"). */
export function formatDateTime(date: Date): string {
  if (date.getTime() !== date.getTime()) return '0001-01-01 00:00:00';
  return (
    `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)} ` +
    `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}`
  );
}

const DATE_RE =
  /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/;

/**
 * Strict date text parser (yyyy-MM-dd[ HH:mm[:ss[.fffffff]]], also with '/' or 'T').
 * Wall-clock values are kept as-is (UTC fields); an explicit offset is applied.
 */
export function tryParseDateStrict(text: string): Date | null {
  const m = DATE_RE.exec(text.trim());
  if (m === null) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = m[4] === undefined ? 0 : Number(m[4]);
  const minute = m[5] === undefined ? 0 : Number(m[5]);
  const second = m[6] === undefined ? 0 : Number(m[6]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const fraction = m[7] === undefined ? 0 : Math.floor(Number('0.' + m[7]) * 1000);
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, second, fraction);
  if (d.getUTCMonth() !== month - 1) return null; // e.g. 02-31
  let ms = d.getTime();
  const zone = m[8];
  if (zone !== undefined && zone !== 'Z') {
    const sign = zone.charCodeAt(0) === 45 ? -1 : 1;
    const digits = zone.substring(1).replace(':', '');
    const offset = Number(digits.substring(0, 2)) * 60 + (digits.length > 2 ? Number(digits.substring(2)) : 0);
    ms -= sign * offset * 60000;
  }
  if (ms < MIN_DATE_MS || ms > MAX_DATE_MS) return null;
  return new Date(ms);
}
