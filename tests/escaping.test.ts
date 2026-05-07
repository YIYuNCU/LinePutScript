import { describe, it, expect } from 'vitest';
import { textReplace, textDeReplace } from '../src/utils/escaping';

describe('escaping', () => {
  it('handles null and undefined', () => {
    expect(textReplace(null)).toBe('');
    expect(textReplace(undefined)).toBe('');
    expect(textDeReplace(null)).toBe('');
    expect(textDeReplace(undefined)).toBe('');
  });

  it('passes through plain text', () => {
    expect(textReplace('hello')).toBe('hello');
    expect(textDeReplace('hello')).toBe('hello');
  });

  it('escapes special characters (textReplace order)', () => {
    expect(textReplace('|')).toBe('/!|');
    expect(textReplace('/')).toBe('/!');
    expect(textReplace(':')).toBe(':');
    // :| cannot be escaped as a unit because | gets replaced first.
    // :| → : + /| → : + /!| = :/!|
    expect(textReplace(':|')).toBe(':/!|');
    expect(textReplace('\t')).toBe('/tab');
    expect(textReplace('\n')).toBe('/n');
    expect(textReplace('\r')).toBe('/r');
    expect(textReplace('#')).toBe('/id');
    expect(textReplace(',')).toBe('/com');
  });

  it('unescapes special characters (textDeReplace order)', () => {
    expect(textDeReplace('/!|')).toBe('|');
    expect(textDeReplace('/!')).toBe('/');
    expect(textDeReplace('/stop')).toBe(':|');
    expect(textDeReplace('/tab')).toBe('\t');
    expect(textDeReplace('/n')).toBe('\n');
    expect(textDeReplace('/r')).toBe('\r');
    expect(textDeReplace('/id')).toBe('#');
    expect(textDeReplace('/com')).toBe(',');
  });

  it('round-trips simple text', () => {
    const original = 'hello world';
    expect(textDeReplace(textReplace(original))).toBe(original);
  });

  it('round-trips text with special chars', () => {
    const testCases = ['|', '/', ':', ':|', '\t', '\n', '#', ',', '/|', 'a|b/c:d#e,f'];
    for (const tc of testCases) {
      expect(textDeReplace(textReplace(tc))).toBe(tc);
    }
  });

  it('round-trips complex mixed text', () => {
    const original = 'hello|world/this:|\thas\n#special,chars\r';
    expect(textDeReplace(textReplace(original))).toBe(original);
  });

  it('handles slash-pipe edge case', () => {
    // Input "/|" -> textReplace -> "/!/!|" -> textDeReplace -> "/|"
    expect(textReplace('/|')).toBe('/!/!|');
    expect(textDeReplace('/!/!|')).toBe('/|');
    expect(textDeReplace(textReplace('/|'))).toBe('/|');
  });

  it('handles consecutive special characters', () => {
    expect(textDeReplace(textReplace('|||'))).toBe('|||');
    expect(textDeReplace(textReplace('///'))).toBe('///');
    expect(textDeReplace(textReplace('#,#,#,'))).toBe('#,#,#,');
  });

  it('handles empty string', () => {
    expect(textReplace('')).toBe('');
    expect(textDeReplace('')).toBe('');
  });
});
