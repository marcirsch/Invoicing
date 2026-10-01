import { describe, expect, it } from 'vitest';
import { parseCsv, serializeCsv } from '../../src/shared/csv/csvDocument';
describe('csv document', () => {
  it('round trips quoted values', () => {
    const d = parseCsv('id,name\n1,"A, B"\n', {
      delimiter: ',',
      lineEnding: '\n',
      bom: false,
    });
    expect(serializeCsv(d)).toBe('id,name\n1,"A, B"\n');
  });
});
