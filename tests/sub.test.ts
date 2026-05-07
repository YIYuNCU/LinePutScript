import { describe, it, expect } from 'vitest';
import { Sub } from '../src/core/sub';

describe('Sub', () => {
  it('creates empty sub', () => {
    const sub = new Sub();
    expect(sub.name).toBe('');
    expect(sub.info).toBe('');
  });

  it('parses from LPS text (name#info)', () => {
    const sub = new Sub('name#value');
    expect(sub.name).toBe('name');
    expect(sub.info).toBe('value');
  });

  it('parses from LPS text (name only)', () => {
    const sub = new Sub('name');
    expect(sub.name).toBe('name');
    expect(sub.info).toBe('');
  });

  it('creates with name and info', () => {
    const sub = new Sub('greeting', 'hello');
    expect(sub.name).toBe('greeting');
    expect(sub.info).toBe('hello'); // storage-escaped
    expect(sub.infoDisplay).toBe('hello');
  });

  it('creates with multiple infos', () => {
    const sub = new Sub('nums', '1', '2', '3');
    expect(sub.name).toBe('nums');
    expect(sub.getInfos()).toEqual(['1', '2', '3']);
  });

  it('typed accessors: getInt/setInt', () => {
    const sub = new Sub('count', '42');
    expect(sub.infoToInt).toBe(42);
    sub.infoToInt = 100;
    expect(sub.info).toBe('100');
  });

  it('typed accessors: getDouble/setDouble', () => {
    const sub = new Sub('pi', '3.14');
    expect(sub.infoToDouble).toBeCloseTo(3.14);
    sub.infoToDouble = 2.71;
    expect(sub.info).toBe('2.71');
  });

  it('typed accessors: getBoolean/setBoolean', () => {
    const sub = new Sub('flag', 'true');
    expect(sub.infoToBoolean).toBe(true);
    sub.infoToBoolean = false;
    expect(sub.info).toBe('False');
  });

  it('typed accessors: getInt64', () => {
    const sub = new Sub('big', '9999999999');
    expect(sub.infoToInt64).toBe(9999999999n);
  });

  it('SaveString (toString)', () => {
    const sub = new Sub('name', 'value');
    expect(sub.toString()).toBe('name#value:|');
  });

  it('SaveString with no info', () => {
    const sub = new Sub('empty', '');
    expect(sub.toString()).toBe('empty:|');
  });

  it('getInfo returns unescaped', () => {
    const sub = new Sub('test', '');
    sub.info = 'hello#world';
    expect(sub.infoDisplay).toBe('hello#world');
    expect(sub.getInfo()).toBe('hello#world');
  });

  it('getInfos splits by comma', () => {
    const sub = new Sub('tags', 'a', 'b', 'c');
    expect(sub.getInfos()).toEqual(['a', 'b', 'c']);
  });

  it('first/last on infos', () => {
    const sub = new Sub('test', 'first', 'second', 'last');
    expect(sub.first()).toBe('first');
    expect(sub.last()).toBe('last');
  });

  it('first/last on single info', () => {
    const sub = new Sub('test', 'only');
    expect(sub.first()).toBe('only');
    expect(sub.last()).toBe('only');
  });

  it('first/last on empty info', () => {
    const sub = new Sub('empty');
    expect(sub.first()).toBeNull();
    expect(sub.last()).toBeNull();
  });

  it('set copies another sub', () => {
    const a = new Sub('a', 'hello');
    const b = new Sub();
    b.set(a);
    expect(b.name).toBe('a');
    expect(b.info).toBe('hello');
  });

  it('clone via load preserves content', () => {
    const original = new Sub('original', 'data');
    const serialized = original.toString();
    // Sub stores info as raw string; :| at end is a Line-level convention.
    // Sub('original', 'data') → _info = 'data' → toString() = 'original#data:|'
    // Parsing back: Split by # → name='original', info='data:|'
    expect(serialized).toBe('original#data:|');
    const loaded = new Sub(serialized);
    expect(loaded.name).toBe('original');
    expect(loaded.info).toBe('data:|');
    expect(loaded.infoDisplay).toBe('data:|');
  });

  it('handles info with special characters', () => {
    const sub = new Sub('test', 'hello|world');
    expect(sub.info).toBe('hello/!|world'); // storage-escaped
    expect(sub.infoDisplay).toBe('hello|world');
  });
});
