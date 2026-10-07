import { describe, expect, it } from 'vitest';
import { assignMeasuredPages } from '../../src/renderer/invoice/assignMeasuredPages';

describe('measured invoice page assignment', () => {
  it('keeps exact-fit rows together and moves overflow to the next page', () => {
    expect(
      assignMeasuredPages(
        [
          { id: 'a', height: 40 },
          { id: 'b', height: 60 },
          { id: 'c', height: 1 },
        ],
        100,
      ).map((page) => page.map((row) => row.id)),
    ).toEqual([['a', 'b'], ['c']]);
  });
  it('keeps unusually tall rows and empty invoices visible', () => {
    expect(
      assignMeasuredPages([{ id: 'tall', height: 250 }], 100).map((page) =>
        page.map((row) => row.id),
      ),
    ).toEqual([['tall']]);
    expect(assignMeasuredPages([], 100)).toEqual([[]]);
  });
  it('recalculates page breaks when measured wrapping heights change', () => {
    const rows = [
      { id: 'a', height: 30 },
      { id: 'b', height: 30 },
      { id: 'c', height: 30 },
    ];
    expect(assignMeasuredPages(rows, 70)).toHaveLength(2);
    expect(
      assignMeasuredPages(
        rows.map((row) => ({ ...row, height: 40 })),
        70,
      ),
    ).toHaveLength(3);
  });
});
