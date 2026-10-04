import { describe, expect, it } from 'vitest';
import { parseCsv, serializeCsv } from '../../src/shared/csv/csvDocument';
import { detectDialect } from '../../src/shared/csv/dialect';

describe('CSV dialect and document', () => {
  it.each([
    ['id,name\n1,Ada\n', ',', '\n', false, true],
    ['id;name\r\n1;Ada\r\n', ';', '\r\n', false, true],
    ['id\tname\n1\tAda', '\t', '\n', false, false],
    ['\ufeffid,name\r\n1,Ada', ',', '\r\n', true, false],
  ] as const)(
    'detects dialect metadata',
    (input, delimiter, lineEnding, bom, finalNewline) => {
      expect(detectDialect(input)).toEqual({
        delimiter,
        lineEnding,
        bom,
        finalNewline,
      });
    },
  );
  it('round trips values with commas, quotes, multiline text, blanks, and unknown columns', () => {
    const source =
      'id,name,note,extra\r\n1,"A, B","two lines\r\nwith ""quotes""",\r\n';
    const document = parseCsv(source, detectDialect(source));
    expect(document.headers).toEqual(['id', 'name', 'note', 'extra']);
    expect(document.rows[0]).toEqual([
      '1',
      'A, B',
      'two lines\r\nwith "quotes"',
      '',
    ]);
    expect(serializeCsv(document)).toBe(source);
  });
  it('preserves BOM, semicolon separator, CRLF, text zeroes, and missing final newline', () => {
    const source = '\ufeffid;postalCode;phone\r\n01;0012;+41 44 12';
    expect(serializeCsv(parseCsv(source, detectDialect(source)))).toBe(source);
  });
  it('honors an explicitly selected delimiter when automatic inspection is ambiguous', () => {
    const input = 'name,email;city\nAda,a@example.test;Zürich\n';
    expect(() => detectDialect(input)).toThrow(/ambiguous/);
    expect(detectDialect(input, ';').delimiter).toBe(';');
  });
  it('ignores delimiters inside quoted header cells during inspection', () => {
    const input = '"Last, First";email\n"Lovelace, Ada";ada@example.test\n';
    expect(detectDialect(input).delimiter).toBe(';');
  });
  it('rejects malformed quotes and inconsistent field counts', () => {
    expect(() =>
      parseCsv('id,name\n1,"broken\n', {
        delimiter: ',',
        lineEnding: '\n',
        bom: false,
        finalNewline: true,
      }),
    ).toThrow();
    expect(() =>
      parseCsv('id,name\n1,Ada,extra\n', {
        delimiter: ',',
        lineEnding: '\n',
        bom: false,
        finalNewline: true,
      }),
    ).toThrow();
    expect(() => detectDialect('onlyheader')).toThrow(/ambiguous/);
  });
});
