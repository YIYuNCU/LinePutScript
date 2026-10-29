import { describe, expect, it } from 'vitest';
import {
  FInt64,
  Line,
  LineDict,
  LPS,
  LpsDict,
  SetObject,
  StringStructure,
  Sub,
  textDeReplace,
  textReplace,
} from '../src';
import { formatDouble, tryParseDateStrict, tryParseDouble, tryParseInt32, tryParseInt64 } from '../src/utils/numeric';

// The C# implementation: chained String.Replace calls.
function referenceReplace(s: string): string {
  return s
    .split('|').join('/|')
    .split('/').join('/!')
    .split(':|').join('/stop')
    .split('\t').join('/tab')
    .split('\n').join('/n')
    .split('\r').join('/r')
    .split('#').join('/id')
    .split(',').join('/com');
}

function referenceDeReplace(s: string): string {
  return s
    .split('/stop').join(':|')
    .split('/equ').join('=')
    .split('/tab').join('\t')
    .split('/n').join('\n')
    .split('/r').join('\r')
    .split('/id').join('#')
    .split('/com').join(',')
    .split('/!').join('/')
    .split('/|').join('|');
}

describe('escaping equals the chained C# replace sequence', () => {
  const alphabet = ['/', '!', '|', ':', 's', 't', 'o', 'p', 'e', 'q', 'u', 'a', 'b', 'n', 'r', 'i', 'd', 'c', 'm', '#', ',', '\t', '\n', '\r', '=', 'x'];
  const tokens = ['/stop', '/equ', '/tab', '/n', '/r', '/id', '/com', '/!', '/|', '/!|', ':|'];

  it('on random strings', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let n = 0; n < 20000; n++) {
      let s = '';
      const len = Math.floor(rnd() * 14);
      for (let i = 0; i < len; i++) {
        s += rnd() < 0.3 ? tokens[Math.floor(rnd() * tokens.length)] : alphabet[Math.floor(rnd() * alphabet.length)];
      }
      expect(textReplace(s), JSON.stringify(s)).toBe(referenceReplace(s));
      expect(textDeReplace(s), JSON.stringify(s)).toBe(referenceDeReplace(s));
    }
  });

  it('round trips every string', () => {
    for (const s of ['a|b', '/!|', '::||', 'x:|y', '/stop', 'a/n', '1,2#3', '\r\n\t']) {
      expect(textDeReplace(textReplace(s))).toBe(s);
    }
  });
});

describe('.NET compatible number helpers', () => {
  it('formats doubles like double.ToString()', () => {
    expect(formatDouble(0.1)).toBe('0.1');
    expect(formatDouble(1e15)).toBe('1E+15');
    expect(formatDouble(123456789012345)).toBe('123456789012345');
    expect(formatDouble(0.0001)).toBe('0.0001');
    expect(formatDouble(0.00001)).toBe('1E-05');
    expect(formatDouble(1.5e-7)).toBe('1.5E-07');
    expect(formatDouble(-2.5e20)).toBe('-2.5E+20');
    expect(formatDouble(NaN)).toBe('NaN');
    expect(formatDouble(-Infinity)).toBe('-Infinity');
    expect(formatDouble(-0)).toBe('-0');
  });

  it('parses like TryParse', () => {
    expect(tryParseInt32('12')).toBe(12);
    expect(tryParseInt32(' -7 ')).toBe(-7);
    expect(tryParseInt32('2147483648')).toBeNull();
    expect(tryParseInt32('1.5')).toBeNull();
    expect(tryParseInt32('abc')).toBeNull();
    expect(tryParseInt64('9223372036854775807')).toBe(9223372036854775807n);
    expect(tryParseInt64('9223372036854775808')).toBeNull();
    expect(tryParseDouble('1,234.5')).toBe(1234.5);
    expect(tryParseDouble('1e3')).toBe(1000);
    expect(tryParseDouble('0x10')).toBeNull();
    expect(tryParseDouble('')).toBeNull();
  });

  it('parses dates as wall-clock UTC', () => {
    expect(tryParseDateStrict('2024-03-05 06:07:08')?.toISOString()).toBe('2024-03-05T06:07:08.000Z');
    expect(tryParseDateStrict('2024-02-31')).toBeNull();
  });
});

describe('Sub typed values (SetObject semantics)', () => {
  it('keeps the kind of the written value', () => {
    const sub = new Sub('n', '');
    sub.infoToInt = 42;
    expect(sub.info).toBe('42');
    expect(sub.infoToInt64).toBe(42n);
    expect(sub.infoToDouble).toBe(42);
    expect(sub.infoToBoolean).toBe(true);
    sub.infoToDouble = 0.5;
    expect(sub.info).toBe('0.5');
    expect(sub.infoToInt).toBe(0); // (int)0.5 truncates
    sub.infoToBoolean = false;
    expect(sub.info).toBe('False');
  });

  it('stores DateTime as ticks and displays it formatted', () => {
    const sub = new Sub('t', '');
    const d = new Date(Date.UTC(2024, 0, 2, 3, 4, 5));
    sub.setDateTime(d);
    expect(sub.info).toBe('638397614450000000');
    expect(sub.infoDisplay).toBe('2024-01-02 03:04:05');
    expect(sub.getDateTime().getTime()).toBe(d.getTime());
  });

  it('stores FInt64 as its raw long and displays the decimal value', () => {
    const sub = new Sub('f', '');
    sub.setFloat(FInt64.fromDouble(1.5));
    expect(sub.info).toBe('1500000000');
    expect(sub.infoDisplay).toBe('1.5');
    expect(sub.getFloat().toDouble()).toBe(1.5);
  });

  it('parses text leniently and defaults to 0 for garbage', () => {
    const sub = new Sub('x', 'abc');
    expect(sub.infoToInt).toBe(0);
    expect(sub.infoToInt64).toBe(0n);
    expect(sub.infoToDouble).toBe(0);
    expect(new Sub('x', '3.9').infoToInt).toBe(3);
    expect(new Sub('x', '99999999999').infoToInt).toBe(Number(BigInt.asIntN(32, 99999999999n)));
  });

  it('copies typed values with set() and the copy constructor', () => {
    const a = new Sub('a', '');
    a.infoToInt = 5;
    const b = new Sub(a);
    a.infoToInt = 6;
    expect(b.info).toBe('5');
    const c = new Sub('c', '');
    c.set(a);
    expect(c.info).toBe('6');
  });

  it('joins several infos and trims trailing commas', () => {
    expect(new Sub('n', 'a', 'b', '').info).toBe('a/comb'.replace('/comb', ',b'));
    expect(new Sub('n', 'a,b', 'c').info).toBe('a/comb,c');
    expect(new Sub('n', 'a', 'b').getInfos()).toEqual(['a', 'b']);
  });

  it('hash code is a wrapped signed 64-bit value, GetHashCode its low 32 bits', () => {
    const sub = new Sub('name', 'info');
    const h = sub.getLongHashCode();
    expect(h).toBe(BigInt.asIntN(64, h));
    expect(sub.getHashCode()).toBe(Number(BigInt.asIntN(32, h)));
    expect(new Sub('name', 'info').equals(sub)).toBe(true);
  });

  it('id is the numeric name or its hash', () => {
    expect(new Sub('123', '').id).toBe(123n);
    expect(new Sub('abc', '').id).toBe(Sub.getHashCode('abc'));
  });

  it('infos cache follows direct info changes', () => {
    const sub = new Sub('s', '');
    sub.infos.setString('a', '1');
    sub.info = 'b=2/n';
    expect(sub.infos.getString('a')).toBeNull();
    expect(sub.infos.getString('b')).toBe('2');
  });
});

describe('SetObject conversions', () => {
  it('converts between kinds', () => {
    expect(SetObject.fromInt(3).getString()).toBe('3');
    expect(SetObject.fromBoolean(true).getStoreString()).toBe('True');
    expect(SetObject.fromBoolean(true).getInteger()).toBe(1);
    expect(SetObject.fromInt(1).getBoolean()).toBe(true);
    expect(SetObject.fromInt(0).getBoolean()).toBe(false);
    expect(SetObject.fromDouble(2.9).getInteger64()).toBe(2n);
    expect(SetObject.fromString('T').getBoolean()).toBe(true);
    expect(SetObject.fromString('yes').getBoolean()).toBe(false);
    expect(SetObject.fromDateTime(new Date(0)).getInteger64()).toBe(621355968000000000n);
  });
});

describe('FInt64 fidelity', () => {
  it('truncates doubles like (long)(v * 1e9)', () => {
    expect(FInt64.fromDouble(0.0000000019).m_value).toBe(1n);
    expect(FInt64.fromDouble(-0.0000000019).m_value).toBe(-1n);
    expect(FInt64.fromDouble(NaN).isNaN()).toBe(true);
    expect(FInt64.fromDouble(Infinity).isPositiveInfinity()).toBe(true);
    expect(FInt64.fromDouble(-Infinity).isNegativeInfinity()).toBe(true);
  });

  it('wraps on overflow instead of growing past 64 bits', () => {
    const r = FInt64.MaxValue.add(FInt64.fromLong(2n));
    expect(r.m_value).toBe(BigInt.asIntN(64, 9223372036854775807n + 2n));
    expect(FInt64.MinValue.negate().m_value).toBe(-9223372036854775808n);
  });

  it('parse follows the C# rules', () => {
    expect(FInt64.parse('').isNaN()).toBe(true);
    expect(FInt64.parse('abc').isNaN()).toBe(true);
    expect(FInt64.parse('1500000000').m_value).toBe(1500000000n);
    expect(FInt64.parse('1.5').m_value).toBe(1500000000n);
    expect(FInt64.parse('99999999999999999999').isPositiveInfinity()).toBe(true);
  });

  it('has comparison operators and constants', () => {
    expect(FInt64.One.lt(FInt64.fromInt(2))).toBe(true);
    expect(FInt64.One.ge(FInt64.One)).toBe(true);
    expect(FInt64.Pi.toDouble()).toBeCloseTo(Math.PI, 8);
    expect(FInt64.E.toDouble()).toBeCloseTo(Math.E, 8);
  });
});

describe('StringStructure fidelity', () => {
  it('terminates every pair with /n like the C# original', () => {
    let store = '';
    const ss = new StringStructure((x) => (store = x), () => store);
    ss.setString('a', '1');
    ss.setString('b', '2');
    expect(store).toBe('a=1/nb=2/n');
    expect(ss.getString('b')).toBe('2');
  });

  it('encodes every newline', () => {
    let store = '';
    const ss = new StringStructure((x) => (store = x), () => store);
    ss.setString('k', 'a\nb\nc');
    expect(ss.getString('k')).toBe('a\nb\nc');
  });

  it('DateTime getter never returns null', () => {
    let store = '';
    const ss = new StringStructure((x) => (store = x), () => store);
    expect(ss.getDateTime('missing').getFullYear()).toBe(1);
    ss.setDateTime('d', new Date(Date.UTC(2020, 5, 6, 7, 8, 9)));
    expect(ss.getDateTime('d').toISOString()).toBe('2020-06-06T07:08:09.000Z');
  });
});

describe('Line fidelity', () => {
  it('parses name, info, subs, text and comments', () => {
    const line = new Line('name#info:|a#1:|b:|text///note');
    expect(line.name).toBe('name');
    expect(line.info).toBe('info');
    expect(line.subs.map((s) => s.name)).toEqual(['a', 'b']);
    expect(line.text).toBe('text');
    expect(line.comments).toBe('note');
    expect(line.toString()).toBe('name#info:|a#1:|b#:|text///note'.replace('b#:|', 'b:|'));
  });

  it('accepts a sub array in the constructor', () => {
    const line = new Line('n', 'i', [new Sub('a', '1')], 'tx');
    expect(line.count).toBe(1);
    expect(line.textDisplay).toBe('tx');
  });

  it('getSubDateTime defaults to MinValue instead of null', () => {
    const line = new Line('n', '');
    expect(line.getSubDateTime('x').getFullYear()).toBe(1);
  });

  it('numeric text getters are strict and default to 0', () => {
    const line = new Line('n', '', 'abc');
    expect(line.textToInt).toBe(0);
    expect(line.textToInt64).toBe(0n);
    expect(line.textToDouble).toBe(0);
    line.text = '12';
    expect(line.textToInt).toBe(12);
  });

  it('an empty line serialises without ":|" on its own but with it inside a document', () => {
    const line = new Line('', '', 'abc');
    expect(line.toString()).toBe('abc');
    const parts: string[] = [];
    line.toString(parts);
    expect(parts.join('')).toBe('\n:|abc');
  });

  it('supports get(), iteration, at(), clear()', () => {
    const line = new Line('n', '');
    line.get('a').setInteger(1);
    expect(line.count).toBe(1);
    expect([...line].map((s) => s.name)).toEqual(['a']);
    expect(line.at(-1)?.name).toBe('a');
    line.clear();
    expect(line.count).toBe(0);
  });

  it('addorReplaceSub copies into the existing sub', () => {
    const line = new Line('n', '');
    const first = new Sub('a', '1');
    line.addSub(first);
    line.addorReplaceSub(new Sub('a', '2'));
    expect(line.count).toBe(1);
    expect(first.info).toBe('2');
  });

  it('remove accepts names and instances', () => {
    const line = new Line('n', '');
    const s = new Sub('a', '1');
    line.addSub(s);
    line.addSub(new Sub('b', '1'));
    expect(line.remove(s)).toBe(true);
    expect(line.remove('b')).toBe(true);
    expect(line.remove('b')).toBe(false);
  });
});

describe('LineDict', () => {
  it('replaces subs of the same name', () => {
    const line = new LineDict('n', '');
    line.addSub(new Sub('a', '1'));
    line.addSub(new Sub('a', '2'));
    expect(line.count).toBe(1);
    expect(line.find('a')?.info).toBe('2');
  });

  it('matches by display text when searching by info', () => {
    const line = new LineDict('n', '');
    line.addSub(new Sub('a', 'x,y'.replace(',', ',')));
    line.findorAdd('b').infoDisplay = 'p|q';
    expect(line.find('b', 'p|q')?.name).toBe('b');
    expect(line.findInfo('p|q')?.name).toBe('b');
  });

  it('contains compares names only', () => {
    const line = new LineDict('n', '');
    line.addSub(new Sub('a', '1'));
    expect(line.contains(new Sub('a', 'other'))).toBe(true);
  });

  it('parses and serialises like Line', () => {
    const src = 'name#info:|a#1:|b#2:|text';
    expect(new LineDict(src).toString()).toBe(src);
  });
});

describe('LPS load and output', () => {
  it('strips a BOM and carriage returns', () => {
    const lps = new LPS('\ufeffa#1:|\r\nb#2:|\r\n');
    expect(lps.count).toBe(2);
    expect(lps.assemblage[0].name).toBe('a');
  });

  it('keeps whitespace-only lines, skips empty ones', () => {
    const lps = new LPS('a#1:|\n\n   \nb#2:|');
    expect(lps.count).toBe(3);
  });

  it('joins continuation lines', () => {
    const lps = new LPS('a#1:|x:\n|y\n');
    expect(lps.count).toBe(1);
    expect(lps.assemblage[0].text).toBe('x/ny');
  });

  it('round trips', () => {
    const src = 'a#1:|s#2:|t///c\nb#x:|';
    expect(new LPS(src).toString()).toBe(src);
  });

  it('length uses the display text', () => {
    const lps = new LPS('a#1:|x/ny');
    // 3 + name(1) + info(1) + display text("x\ny" = 3) + 6
    expect(lps.length).toBe(14);
  });

  it('hash is signed 64-bit', () => {
    const h = new LPS('a#1:|\nb#2:|').getLongHashCode();
    expect(h).toBe(BigInt.asIntN(64, h));
  });

  it('supports get() and iteration', () => {
    const lps = new LPS();
    lps.get('x').infoToInt = 3;
    expect([...lps].map((l) => l.name)).toEqual(['x']);
    expect(lps.getLineInt('x')).toBe(3);
  });
});

describe('LpsDict', () => {
  const src = 'hello#你好:|\nbye#再见:|\n';

  it('loads key#value files (the Localization format) and replaces duplicates', () => {
    const dict = new LpsDict(src + 'hello#hi:|');
    expect(dict.count).toBe(2);
    expect(dict.getLineString('hello')).toBe('hi');
    expect(dict.getLineString('missing', 'dflt')).toBe('dflt');
  });

  it('looks up by name and serialises in insertion order', () => {
    const dict = new LpsDict(src);
    expect(dict.findLine('bye')?.info).toBe('再见');
    expect(dict.findLine('bye', '再见')).not.toBeNull();
    expect(dict.toString()).toBe('hello#你好:|\nbye#再见:|');
  });

  it('add replaces by name and remove works', () => {
    const dict = new LpsDict();
    dict.addLine(new Line('a', '1'));
    dict.addLine(new Line('a', '2'));
    expect(dict.count).toBe(1);
    expect(dict.getLineInt('a')).toBe(2);
    expect(dict.remove('a')).toBe(true);
    expect(dict.count).toBe(0);
  });

  it('typed accessors and get()', () => {
    const dict = new LpsDict();
    dict.setLineBool('flag', true);
    dict.get('n').infoToInt = 9;
    expect(dict.getLineBool('flag')).toBe(true);
    expect(dict.getLineInt('n')).toBe(9);
    expect(dict.getLineDateTime('none').getFullYear()).toBe(1);
  });
});
