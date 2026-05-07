export function splitLimited(text: string, separator: string, count: number = -1): string[] {
  if (count === -1) {
    return text.split(separator);
  }
  const result: string[] = [];
  let remaining = text;
  for (let i = 0; i < count; i++) {
    const idx = remaining.indexOf(separator);
    if (idx === -1) break;
    result.push(remaining.substring(0, idx));
    remaining = remaining.substring(idx + separator.length);
  }
  result.push(remaining);
  return result;
}
