// Display <-> storage escaping (Sub.TextReplace / Sub.TextDeReplace in the C# original).
//
// The C# implementation chains String.Replace calls in a fixed order. Both
// directions are reproduced here as single left-to-right passes that give
// exactly the same results (verified by a randomized equivalence test).
//
//   |  -> /!|   (the "|" is escaped first and the "/" it introduces is escaped again)
//   /  -> /!
//   \t -> /tab   \n -> /n   \r -> /r   #  -> /id   ,  -> /com
//
// Note that ":|" never survives as a unit: its "|" is escaped, giving ":/!|".

/** Convert display text to storage text (no LPS keywords left in it). */
export function textReplace(text: string | null | undefined): string {
  if (!text) return '';
  let out = '';
  let last = 0;
  const len = text.length;
  for (let i = 0; i < len; i++) {
    let rep: string;
    switch (text.charCodeAt(i)) {
      case 124: // |
        rep = '/!|';
        break;
      case 47: // /
        rep = '/!';
        break;
      case 9: // \t
        rep = '/tab';
        break;
      case 10: // \n
        rep = '/n';
        break;
      case 13: // \r
        rep = '/r';
        break;
      case 35: // #
        rep = '/id';
        break;
      case 44: // ,
        rep = '/com';
        break;
      default:
        continue;
    }
    if (i > last) out += text.substring(last, i);
    out += rep;
    last = i + 1;
  }
  if (last === 0) return text;
  return last < len ? out + text.substring(last) : out;
}

/** Convert storage text back to display text. */
export function textDeReplace(text: string | null | undefined): string {
  if (!text) return '';
  let p = text.indexOf('/');
  if (p === -1) return text;
  let out = '';
  let last = 0;
  while (p !== -1) {
    let rep: string | null = null;
    let skip = 0;
    switch (text.charCodeAt(p + 1)) {
      case 115: // /stop
        if (text.startsWith('stop', p + 1)) {
          rep = ':|';
          skip = 5;
        }
        break;
      case 101: // /equ
        if (text.startsWith('equ', p + 1)) {
          rep = '=';
          skip = 4;
        }
        break;
      case 116: // /tab
        if (text.startsWith('tab', p + 1)) {
          rep = '\t';
          skip = 4;
        }
        break;
      case 110: // /n
        rep = '\n';
        skip = 2;
        break;
      case 114: // /r
        rep = '\r';
        skip = 2;
        break;
      case 105: // /id
        if (text.charCodeAt(p + 2) === 100) {
          rep = '#';
          skip = 3;
        }
        break;
      case 99: // /com
        if (text.startsWith('com', p + 1)) {
          rep = ',';
          skip = 4;
        }
        break;
      case 33: // "/!" -> "/", and "/!|" collapses to "|" ("/!" -> "/" is followed by "/|" -> "|")
        if (text.charCodeAt(p + 2) === 124) {
          rep = '|';
          skip = 3;
        } else {
          rep = '/';
          skip = 2;
        }
        break;
      case 124: // /|
        rep = '|';
        skip = 2;
        break;
    }
    if (rep === null) {
      p = text.indexOf('/', p + 1);
      continue;
    }
    if (p > last) out += text.substring(last, p);
    out += rep;
    last = p + skip;
    p = text.indexOf('/', last);
  }
  if (last === 0) return text;
  return last < text.length ? out + text.substring(last) : out;
}
