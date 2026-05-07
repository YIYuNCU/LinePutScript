import { describe, it, expect } from 'vitest';
import { Line } from '../src/core/line';
import { Sub } from '../src/core/sub';

describe('Line', () => {
  it('creates empty line', () => {
    const line = new Line();
    expect(line.name).toBe('');
    expect(line.text).toBe('');
    expect(line.subs).toHaveLength(0);
  });

  it('parses from LPS text (name#info:|sub1#v1:|text)', () => {
    const line = new Line('note#greeting:|sub#hello:|world');
    expect(line.name).toBe('note');
    expect(line.info).toBe('greeting');
    expect(line.text).toBe('world');
    expect(line.subs).toHaveLength(1);
    expect(line.subs[0].name).toBe('sub');
    expect(line.subs[0].info).toBe('hello');
  });

  it('parses line with comments', () => {
    const line = new Line('name#info:|text///comment');
    expect(line.name).toBe('name');
    expect(line.info).toBe('info');
    expect(line.text).toBe('text');
    expect(line.comments).toBe('comment');
  });

  it('adds and finds subs', () => {
    const line = new Line('root');
    line.addSub(new Sub('a', '1'));
    line.addSub(new Sub('b', '2'));
    expect(line.find('a')?.info).toBe('1');
    expect(line.find('c')).toBeNull();
  });

  it('addorReplaceSub replaces existing', () => {
    const line = new Line('root');
    line.addSub(new Sub('key', 'old'));
    line.addorReplaceSub(new Sub('key', 'new'));
    expect(line.find('key')?.info).toBe('new');
    expect(line.subs).toHaveLength(1);
  });

  it('addorReplaceSub adds if not exists', () => {
    const line = new Line('root');
    line.addorReplaceSub(new Sub('key', 'val'));
    expect(line.find('key')?.info).toBe('val');
    expect(line.subs).toHaveLength(1);
  });

  it('removeByName', () => {
    const line = new Line('root');
    line.addSub(new Sub('a', '1'));
    line.addSub(new Sub('b', '2'));
    expect(line.removeByName('a')).toBe(true);
    expect(line.subs).toHaveLength(1);
    expect(line.removeByName('nonexistent')).toBe(false);
  });

  it('removeAll removes all with matching name', () => {
    const line = new Line('root');
    line.addSub(new Sub('dup', '1'));
    line.addSub(new Sub('other', '2'));
    line.addSub(new Sub('dup', '3'));
    line.removeAll('dup');
    expect(line.subs).toHaveLength(1);
    expect(line.subs[0].name).toBe('other');
  });

  it('findorAdd creates if missing', () => {
    const line = new Line('root');
    const found = line.findorAdd('auto');
    expect(found.name).toBe('auto');
    expect(line.subs).toHaveLength(1);
    expect(line.findorAdd('auto')).toBe(found); // same instance
  });

  it('search and searchAll', () => {
    const line = new Line('root');
    line.addSub(new Sub('hello', '1'));
    line.addSub(new Sub('world', '2'));
    line.addSub(new Sub('help', '3'));
    expect(line.search('hel')?.name).toBe('hello');
    const all = line.searchAll('hel');
    expect(all).toHaveLength(2);
  });

  it('text property escaping', () => {
    const line = new Line('test', '', 'hello|world');
    expect(line.text).toBe('hello/!|world');
    expect(line.textDisplay).toBe('hello|world');
  });

  it('typed shorthands on subs', () => {
    const line = new Line('root');
    line.setSubInt('count', 42);
    expect(line.getSubInt('count')).toBe(42);
    line.setSubBool('flag', true);
    expect(line.getSubBool('flag')).toBe(true);
    line.setSubString('msg', 'hi');
    expect(line.getSubString('msg')).toBe('hi');
  });

  it('typed shorthands return defaults', () => {
    const line = new Line('root');
    expect(line.getSubInt('missing', 99)).toBe(99);
    expect(line.getSubBool('missing')).toBe(false);
    expect(line.getSubString('missing')).toBeNull();
  });

  it('serializes to string and back', () => {
    const original = new Line('root#info:|sub1#val1:|sub2#val2:|text');
    const serialized = original.toString();
    const restored = new Line(serialized);
    expect(restored.name).toBe('root');
    expect(restored.info).toBe('info');
    expect(restored.text).toBe('text');
    expect(restored.subs).toHaveLength(2);
  });

  it('indexOf and indexsOf', () => {
    const line = new Line('root');
    line.addSub(new Sub('a', ''));
    line.addSub(new Sub('b', ''));
    line.addSub(new Sub('a', ''));
    expect(line.indexOf('a')).toBe(0);
    expect(line.indexOf('c')).toBe(-1);
    expect(line.indexsOf('a')).toEqual([0, 2]);
  });

  it('insertSub and insertRange', () => {
    const line = new Line('root');
    line.addSub(new Sub('a', ''));
    line.insertSub(0, new Sub('b', ''));
    expect(line.subs[0].name).toBe('b');
    expect(line.subs).toHaveLength(2);
  });

  it('contains and containsByName', () => {
    const line = new Line('root');
    const sub = new Sub('a', '1');
    line.addSub(sub);
    expect(line.contains(sub)).toBe(true);
    expect(line.containsByName('a')).toBe(true);
    expect(line.containsByName('b')).toBe(false);
  });

  it('removeAt', () => {
    const line = new Line('root');
    line.addSub(new Sub('a', ''));
    line.addSub(new Sub('b', ''));
    line.removeAt(0);
    expect(line.subs[0].name).toBe('b');
  });
});
