import { describe, it, expect } from 'vitest';
import { StringStructure } from '../src/structure/string-structure';

describe('StringStructure', () => {
  it('get/set string values', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.setString('key1', 'value1');
    expect(ss.getString('key1')).toBe('value1');
    expect(data).toContain('key1=value1');
  });

  it('returns default for missing key', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    expect(ss.getString('missing')).toBeNull();
    expect(ss.getString('missing', 'default')).toBe('default');
  });

  it('getter with bracket access', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.set('name', 'test');
    expect(ss.get('name')).toBe('test');
  });

  it('bool get/set', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.setBool('flag', true);
    expect(ss.getBool('flag')).toBe(true);
    expect(ss.getBool('missing')).toBe(false);
  });

  it('int get/set', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.setInt('count', 42);
    expect(ss.getInt('count')).toBe(42);
    expect(ss.getInt('missing', 99)).toBe(99);
  });

  it('double get/set', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.setDouble('pi', 3.14);
    expect(ss.getDouble('pi')).toBeCloseTo(3.14);
  });

  it('remove key', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.setString('key', 'val');
    expect(ss.containsKey('key')).toBe(true);
    ss.remove('key');
    expect(ss.containsKey('key')).toBe(false);
  });

  it('clear removes all', () => {
    let data = 'a=1/nb=2';
    const ss = new StringStructure(x => data = x, () => data);
    expect(ss.count).toBe(2);
    ss.clear();
    expect(ss.count).toBe(0);
    expect(data).toBe('');
  });

  it('keys and values', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.setString('a', '1');
    ss.setString('b', '2');
    expect(ss.keys).toEqual(['a', 'b']);
    expect(ss.values).toEqual(['1', '2']);
  });

  it('iterator', () => {
    let data = '';
    const ss = new StringStructure(x => data = x, () => data);
    ss.setString('a', '1');
    ss.setString('b', '2');
    const entries = Array.from(ss);
    expect(entries).toHaveLength(2);
  });
});
