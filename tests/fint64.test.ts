import { describe, it, expect } from 'vitest';
import { FInt64 } from '../src/utils/fint64';

describe('FInt64', () => {
  it('creates from double', () => {
    const v = FInt64.fromDouble(3.14);
    expect(v.toDouble()).toBeCloseTo(3.14, 5);
  });

  it('creates from int', () => {
    const v = FInt64.fromInt(42);
    expect(v.toDouble()).toBe(42);
  });

  it('creates from long', () => {
    const v = FInt64.fromLong(1000000000n);
    expect(v.toDouble()).toBe(1);
  });

  it('supports arithmetic (add)', () => {
    const a = FInt64.fromDouble(1.5);
    const b = FInt64.fromDouble(2.5);
    expect(a.add(b).toDouble()).toBeCloseTo(4, 5);
  });

  it('supports arithmetic (sub)', () => {
    const a = FInt64.fromDouble(5.5);
    const b = FInt64.fromDouble(2.2);
    expect(a.sub(b).toDouble()).toBeCloseTo(3.3, 4);
  });

  it('supports arithmetic (mul)', () => {
    const a = FInt64.fromDouble(3);
    const b = FInt64.fromDouble(4);
    expect(a.mul(b).toDouble()).toBeCloseTo(12, 4);
  });

  it('supports arithmetic (div)', () => {
    const a = FInt64.fromDouble(10);
    const b = FInt64.fromDouble(3);
    expect(a.div(b).toDouble()).toBeCloseTo(3.333333333, 5);
  });

  it('comparison', () => {
    const a = FInt64.fromDouble(5);
    const b = FInt64.fromDouble(10);
    expect(a.compareTo(b)).toBe(-1);
    expect(b.compareTo(a)).toBe(1);
    expect(a.compareTo(a)).toBe(0);
  });

  it('equality', () => {
    const a = FInt64.fromDouble(3.14);
    const b = FInt64.fromDouble(3.14);
    expect(a.equals(b)).toBe(true);
  });

  it('NaN handling', () => {
    expect(FInt64.NaN.isNaN()).toBe(true);
    expect(FInt64.NaN.isFinite()).toBe(false);
  });

  it('parse from store string', () => {
    const v = FInt64.parse('3140000000');
    expect(v.toDouble()).toBeCloseTo(3.14, 5);
  });

  it('parse from display string', () => {
    const v = FInt64.parse('3.14');
    expect(v.toDouble()).toBeCloseTo(3.14, 5);
  });

  it('toStoreString and back', () => {
    const original = FInt64.fromDouble(42.5);
    const stored = original.toStoreString();
    const restored = FInt64.parse(stored);
    expect(restored.toDouble()).toBeCloseTo(42.5, 5);
  });

  it('fromObject handles various types', () => {
    expect(FInt64.fromObject(3.14).toDouble()).toBeCloseTo(3.14, 5);
    expect(FInt64.fromObject(42).toDouble()).toBeCloseTo(42, 5);
    expect(FInt64.fromObject('3.14').toDouble()).toBeCloseTo(3.14, 5);
    expect(FInt64.fromObject('3140000000').toDouble()).toBeCloseTo(3.14, 5);
  });

  it('increment and decrement', () => {
    const v = FInt64.fromInt(5);
    expect(v.increment().toDouble()).toBe(6);
    expect(v.decrement().toDouble()).toBe(4);
  });
});
