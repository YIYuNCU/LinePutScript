import { describe, it, expect, beforeAll } from 'vitest';
import { LPS, LpsDocument, Line, Sub } from '../src/index';
import { readFileSync, existsSync } from 'fs';

const FIXTURE_PATH = 'VPet/mod/0000_core/info.lps';

// Skip the entire suite when the VPet fixture file is not available
// (e.g. CI, npm install, fresh clone without the VPet submodule)
const hasFixture = existsSync(FIXTURE_PATH);

(hasFixture ? describe : describe.skip)('VPet info.lps integration', () => {
  let lpsContent: string;
  let doc: LPS;

  beforeAll(() => {
    lpsContent = readFileSync(FIXTURE_PATH, 'utf-8');
    doc = new LPS(lpsContent);
  });

  it('parses all lines', () => {
    expect(doc.count).toBe(8);
  });

  it('parses vupmod line with subs', () => {
    const vupmod = doc.findLine('vupmod');
    expect(vupmod).not.toBeNull();
    expect(vupmod!.infoDisplay).toBe('Core');
    expect(vupmod!.subs).toHaveLength(3);

    const author = vupmod!.find('author');
    expect(author).not.toBeNull();
    expect(author!.infoDisplay).toBe('LorisYounger');

    const gamever = vupmod!.find('gamever');
    expect(gamever).not.toBeNull();
    expect(gamever!.infoDisplay).toBe('11000');

    const ver = vupmod!.find('ver');
    expect(ver).not.toBeNull();
    expect(ver!.infoDisplay).toBe('11000');
  });

  it('parses intro line with /com as comma', () => {
    const intro = doc.findLine('intro');
    expect(intro).not.toBeNull();
    expect(intro!.infoDisplay).toBe('这是虚拟桌宠模拟器的核心运行文件,可以参考此文件编写mod');
  });

  it('parses authorid and itemid as numeric', () => {
    expect(doc.getLineInt('authorid')).toBe(253101309);
    expect(doc.getLineInt('itemid')).toBe(1);
  });

  it('parses lang lines with subs', () => {
    const langLines = doc.findAllLine('lang');
    expect(langLines).toHaveLength(3);

    const en = langLines.find(l => l.infoDisplay === 'en');
    expect(en).not.toBeNull();
    expect(en!.subs).toHaveLength(2);
    // First sub has Chinese description as name, English translation as info
    expect(en!.subs[0].infoDisplay).toBe('This is the core running file of the virtual desktop pet simulator, and you can refer to this file to write mods');
    expect(en!.subs[1].name).toBe('Core');
    expect(en!.subs[1].infoDisplay).toBe('Core');
  });

  it('round-trip preserves content', () => {
    const serialized = doc.toString();
    const reparsed = new LPS(serialized);
    expect(reparsed.count).toBe(8);

    // Verify a few key values after round-trip
    expect(reparsed.getLineInt('authorid')).toBe(253101309);
    expect(reparsed.findLine('intro')!.infoDisplay)
      .toBe('这是虚拟桌宠模拟器的核心运行文件,可以参考此文件编写mod');
  });

  it('modify and verify', () => {
    const modDoc = new LPS(lpsContent);

    // Update game version
    const vupmod = modDoc.findLine('vupmod')!;
    vupmod.find('ver')!.infoDisplay = '12000';
    expect(vupmod.find('ver')!.infoDisplay).toBe('12000');

    // Add new line
    modDoc.addLine(new Line('newfield', 'test_value'));
    expect(modDoc.findLine('newfield')!.infoDisplay).toBe('test_value');
    expect(modDoc.count).toBe(9);

    // Serialize doesn't crash
    const serialized = modDoc.toString();
    expect(serialized).toContain('12000');
    expect(serialized).toContain('newfield');
  });

  it('handles authorid via typed shorthand', () => {
    const doc2 = new LPS(lpsContent);
    expect(doc2.getLineInt('authorid')).toBe(253101309);
    doc2.setLineInt('authorid', 999);
    expect(doc2.getLineInt('authorid')).toBe(999);
  });

  it('handles lang line Chinese sub names containing commas', () => {
    const en = doc.findLine('lang', 'en');
    expect(en).not.toBeNull();
    // The first sub's name is a Chinese sentence containing a comma
    const firstSub = en!.subs[0];
    expect(firstSub.name).toContain(',');
    expect(firstSub.name).toContain('虚拟桌宠模拟器');
  });

  it('supports getInfos on comma-separated values', () => {
    // Create a sub with multiple values and verify getInfos works
    const sub = new Sub('tags', 'val1', 'val2', 'val3');
    expect(sub.getInfos()).toEqual(['val1', 'val2', 'val3']);
  });
});
