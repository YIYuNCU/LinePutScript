export function textReplace(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  let result = text;
  result = result.replace(/\|/g, '/|');
  result = result.replace(/\//g, '/!');
  result = result.replace(/:\|/g, '/stop');
  result = result.replace(/\t/g, '/tab');
  result = result.replace(/\n/g, '/n');
  result = result.replace(/\r/g, '/r');
  result = result.replace(/#/g, '/id');
  result = result.replace(/,/g, '/com');
  return result;
}

export function textDeReplace(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  let result = text;
  result = result.replace(/\/stop/g, ':|');
  result = result.replace(/\/equ/g, '=');
  result = result.replace(/\/tab/g, '\t');
  result = result.replace(/\/n/g, '\n');
  result = result.replace(/\/r/g, '\r');
  result = result.replace(/\/id/g, '#');
  result = result.replace(/\/com/g, ',');
  result = result.replace(/\/!/g, '/');
  result = result.replace(/\/\|/g, '|');
  return result;
}
