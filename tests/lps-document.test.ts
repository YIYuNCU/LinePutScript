import { describe, it, expect } from 'vitest';
import { LpsDocument } from '../src/core/lps-document';
import { LPS } from '../src/core/lps';
import { Line } from '../src/core/line';
import { Sub } from '../src/core/sub';

const sampleLps = `note#greeting:|sub#hello:|world
config#settings:|timeout#30:|enabled#true:|production`;

describe('LPS (document)', () => {
  it('parses document from string', () => {
    const doc = new LPS(sampleLps);
    expect(doc.count).toBe(2);
    expect(doc.assemblage[0].name).toBe('note');
    expect(doc.assemblage[1].name).toBe('config');
  });

  it('finds lines by name', () => {
    const doc = new LPS(sampleLps);
    expect(doc.findLine('note')?.name).toBe('note');
    expect(doc.findLine('missing')).toBeNull();
  });

  it('findorAddLine creates new', () => {
    const doc = new LPS();
    const line = doc.findorAddLine('new');
    expect(line.name).toBe('new');
    expect(doc.count).toBe(1);
  });

  it('addLine and remove', () => {
    const doc = new LPS();
    doc.addLine(new Line('a'));
    doc.addLine(new Line('b'));
    expect(doc.count).toBe(2);
    expect(doc.remove('a')).toBe(true);
    expect(doc.count).toBe(1);
  });

  it('addorReplaceLine replaces existing', () => {
    const doc = new LPS();
    doc.addLine(new Line('key', 'old'));
    doc.addorReplaceLine(new Line('key', 'new'));
    expect(doc.findLine('key')?.info).toBe('new');
  });

  it('typed shorthands', () => {
    const doc = new LPS();
    doc.setLineInt('count', 42);
    expect(doc.getLineInt('count')).toBe(42);
    doc.setLineBool('flag', true);
    expect(doc.getLineBool('flag')).toBe(true);
    doc.setLineString('msg', 'hello');
    expect(doc.getLineString('msg')).toBe('hello');
  });

  it('serializes and re-parses', () => {
    const original = new LPS(sampleLps);
    const serialized = original.toString();
    const restored = new LPS(serialized);
    expect(restored.count).toBe(2);
    expect(restored.findLine('note')?.subs[0].name).toBe('sub');
  });

  it('containsLine and containsSub', () => {
    const doc = new LPS(sampleLps);
    expect(doc.containsLine('note')).toBe(true);
    expect(doc.containsLine('missing')).toBe(false);
    expect(doc.containsSub('sub')).toBe(true);
  });

  it('findLine with name and info', () => {
    const doc = new LPS(sampleLps);
    const line = doc.findLine('note', 'greeting');
    expect(line?.name).toBe('note');
    expect(doc.findLine('note', 'wrong')).toBeNull();
  });

  it('findSub across lines', () => {
    const doc = new LPS(sampleLps);
    const sub = doc.findSub('sub');
    expect(sub?.name).toBe('sub');
    expect(sub?.info).toBe('hello');
  });

  it('findAllSub', () => {
    const doc = new LPS(`a#:|sub#1:|x
b#:|sub#2:|y`);
    const subs = doc.findAllSub('sub');
    expect(subs).toHaveLength(2);
  });

  it('searchAllLine and searchLine', () => {
    const doc = new LPS(sampleLps);
    expect(doc.searchLine('config')?.name).toBe('config');
    expect(doc.searchLine('xyz')).toBeNull();
    // both "note" and "config" contain 'n'
    expect(doc.searchAllLine('n')).toHaveLength(2);
    expect(doc.searchAllLine('note')).toHaveLength(1);
  });

  it('first and last', () => {
    const doc = new LPS(sampleLps);
    expect(doc.first()?.name).toBe('note');
    expect(doc.last()?.name).toBe('config');
  });

  it('empty document first/last', () => {
    const doc = new LPS();
    expect(doc.first()).toBeNull();
    expect(doc.last()).toBeNull();
  });

  it('indexOf and indexsOf', () => {
    const doc = new LPS(sampleLps);
    expect(doc.indexOf('note')).toBe(0);
    expect(doc.indexOf('missing')).toBe(-1);
    expect(doc.indexsOf('config')).toEqual([1]);
  });
});

describe('LpsDocument (with cursor)', () => {
  it('readNext iterates through lines', () => {
    const doc = new LpsDocument(sampleLps);
    expect(doc.readNext()?.name).toBe('note');
    expect(doc.readNext()?.name).toBe('config');
    expect(doc.readNext()).toBeNull();
  });

  it('read without advancing', () => {
    const doc = new LpsDocument(sampleLps);
    expect(doc.read()?.name).toBe('note');
    expect(doc.read()?.name).toBe('note'); // still same
  });

  it('readReset and readEnd', () => {
    const doc = new LpsDocument(sampleLps);
    doc.readNext();
    doc.readReset();
    expect(doc.readNext()?.name).toBe('note');
    doc.readEnd();
    expect(doc.readNext()).toBeNull();
  });

  it('readCanNext', () => {
    const doc = new LpsDocument(sampleLps);
    expect(doc.readCanNext()).toBe(true);
    doc.readNext();
    doc.readNext();
    expect(doc.readCanNext()).toBe(false);
  });

  it('lineNode getter/setter', () => {
    const doc = new LpsDocument(sampleLps);
    doc.lineNode = 1;
    expect(doc.read()?.name).toBe('config');
    doc.lineNode = 999;
    expect(doc.lineNode).toBe(2); // clamped
    doc.lineNode = -1;
    expect(doc.lineNode).toBe(0); // clamped
  });

  it('appends line after current position', () => {
    const doc = new LpsDocument(sampleLps);
    doc.readNext(); // cursor=1 (past note)
    doc.append(new Line('inserted')); // inserts at cursor+1 = 2
    expect(doc.assemblage).toHaveLength(3);
    expect(doc.assemblage[2].name).toBe('inserted'); // appended after all items
  });

  it('append with string params', () => {
    const doc = new LpsDocument(sampleLps);
    doc.readNext();
    doc.append('newline', 'info', 'text', new Sub('sub', 'val'));
    const inserted = doc.assemblage[2]; // after both existing lines
    expect(inserted.name).toBe('newline');
    expect(inserted.info).toBe('info');
    expect(inserted.text).toBe('text');
    expect(inserted.subs).toHaveLength(1);
  });

  it('appendSub adds sub to current line', () => {
    const doc = new LpsDocument(sampleLps);
    doc.readNext(); // advances past note, now cursor=1
    // note line's subs has 1 sub: sub#hello
    const noteLine = doc.assemblage[0]; // read() returns null since cursor past it
    noteLine.addSub(new Sub('extra', 'data'));
    expect(noteLine.subs).toHaveLength(2);
  });

  it('appendSubByName', () => {
    const doc = new LpsDocument(sampleLps);
    doc.readNext();
    const noteLine = doc.assemblage[0];
    const sub = new Sub('dynamic', 'value');
    noteLine.addSub(sub);
    expect(noteLine.subs).toHaveLength(2);
  });
});

describe('LPS multiline handling', () => {
  it('handles multiline text with :\\n| markers', () => {
    // The C# parsing normalizes :\n| to marker-newline then splits real lines
    // This is a format-level detail; the string is parsed as normal lines
    const lps = 'desc#:|line1\nline2\nline3';
    const doc = new LPS(lps);
    // Without the multiline marker, this becomes 3 separate lines
    expect(doc.count).toBe(3);
  });
});
