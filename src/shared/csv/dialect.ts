export type CsvDelimiter = ',' | ';' | '\t';
export interface CsvDialect {
  delimiter: CsvDelimiter;
  lineEnding: '\n' | '\r\n';
  bom: boolean;
}
export function detectDialect(input: string): CsvDialect {
  const bom = input.charCodeAt(0) === 0xfeff;
  const text = bom ? input.slice(1) : input;
  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
  const line = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = ([',', ';', '\t'] as const).map((d) => ({
    d,
    n: [...line].filter((c) => c === d).length,
  }));
  const max = Math.max(...counts.map((x) => x.n));
  if (max === 0 || counts.filter((x) => x.n === max).length > 1)
    throw new Error(
      'CSV delimiter is ambiguous; choose comma, semicolon, or tab.',
    );
  return { delimiter: counts.find((x) => x.n === max)!.d, lineEnding, bom };
}
