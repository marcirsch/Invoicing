export type CsvDelimiter = ',' | ';' | '\t';
export interface CsvDialect {
  delimiter: CsvDelimiter;
  lineEnding: '\n' | '\r\n';
  bom: boolean;
  finalNewline: boolean;
}
export function detectDialect(
  input: string,
  selectedDelimiter?: CsvDelimiter,
): CsvDialect {
  const bom = input.charCodeAt(0) === 0xfeff;
  const text = bom ? input.slice(1) : input;
  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
  const line = logicalHeader(text);
  const counts = ([',', ';', '\t'] as const).map((d) => ({
    d,
    n: countOutsideQuotes(line, d),
  }));
  const max = Math.max(...counts.map((x) => x.n));
  if (
    !selectedDelimiter &&
    (max === 0 || counts.filter((x) => x.n === max).length > 1)
  )
    throw new Error(
      'CSV delimiter is ambiguous; choose comma, semicolon, or tab.',
    );
  return {
    delimiter: selectedDelimiter ?? counts.find((x) => x.n === max)!.d,
    lineEnding,
    bom,
    finalNewline: text.endsWith('\n'),
  };
}

function logicalHeader(text: string): string {
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if ((character === '\n' || character === '\r') && !quoted) {
      return text.slice(0, index);
    }
  }
  return text;
}

function countOutsideQuotes(text: string, delimiter: CsvDelimiter): number {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) count += 1;
  }
  return count;
}
