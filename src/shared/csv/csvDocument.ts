import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type { CsvDialect } from './dialect';
export interface CsvDocument {
  headers: string[];
  rows: string[][];
  dialect: CsvDialect;
}
export function parseCsv(input: string, dialect: CsvDialect): CsvDocument {
  const source =
    dialect.bom && input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records = parse(source, {
    delimiter: dialect.delimiter,
    relax_quotes: false,
    skip_empty_lines: false,
    bom: false,
  }) as unknown;
  if (
    !Array.isArray(records) ||
    records.length < 1 ||
    !records.every(Array.isArray)
  )
    throw new Error('CSV content is malformed.');
  const rows = records as string[][];
  const headers = rows.shift() ?? [];
  if (!headers.length || rows.some((row) => row.length !== headers.length))
    throw new Error('CSV rows do not match the header.');
  return { headers, rows, dialect };
}
export function serializeCsv(document: CsvDocument): string {
  const output = stringify([document.headers, ...document.rows], {
    delimiter: document.dialect.delimiter,
    record_delimiter: document.dialect.lineEnding,
    quoted: false,
  });
  const withoutFinalNewline = output.endsWith(document.dialect.lineEnding)
    ? output.slice(0, -document.dialect.lineEnding.length)
    : output;
  const serialized = document.dialect.finalNewline
    ? withoutFinalNewline + document.dialect.lineEnding
    : withoutFinalNewline;
  return (document.dialect.bom ? '\ufeff' : '') + serialized;
}
