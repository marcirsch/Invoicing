import { describe, expect, it } from 'vitest';
import { assignMeasuredPages } from '../../src/renderer/invoice/assignMeasuredPages';
import { resolvePageLines } from '../../src/renderer/invoice/resolvePageLines';

const ids = (pages: { id: string }[][]) =>
  pages.map((page) => page.map((row) => row.id));

describe('measured invoice page assignment', () => {
  it('resolves stable page IDs to the current draft line values', () => {
    const first = [{ id: 'one', description: 'Old', hours: '1', rate: '10' }];
    const changed = [{ id: 'one', description: 'New', hours: '2', rate: '30' }];
    expect(resolvePageLines([['one']], first)[0]).toEqual(first);
    expect(resolvePageLines([['one']], changed)[0]).toEqual(changed);
  });
  const capacities = {
    first: 100,
    continuation: 80,
    final: 50,
    firstFinal: 70,
  };

  it('keeps a one-page invoice within the first-page closing capacity', () => {
    const result = assignMeasuredPages(
      [
        { id: 'a', height: 40 },
        { id: 'b', height: 30 },
      ],
      capacities,
    );
    expect(ids(result.pages)).toEqual([['a', 'b']]);
  });

  it('uses distinct first and continuation capacities and reserves final closing space', () => {
    const result = assignMeasuredPages(
      [
        { id: 'a', height: 60 },
        { id: 'b', height: 40 },
        { id: 'c', height: 30 },
        { id: 'd', height: 20 },
      ],
      capacities,
    );
    expect(ids(result.pages)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('moves a trailing intact row to protect closing space', () => {
    const result = assignMeasuredPages(
      [
        { id: 'a', height: 50 },
        { id: 'b', height: 30 },
      ],
      capacities,
    );
    expect(ids(result.pages)).toEqual([['a'], ['b']]);
  });

  it('supports multiple continuation pages and exact fits', () => {
    const result = assignMeasuredPages(
      [
        { id: 'a', height: 100 },
        { id: 'b', height: 80 },
        { id: 'c', height: 80 },
        { id: 'd', height: 50 },
      ],
      capacities,
    );
    expect(ids(result.pages)).toEqual([['a'], ['b'], ['c'], ['d']]);
    expect(result.oversizedItemIds).toEqual([]);
  });

  it('keeps empty invoices visible and marks rows taller than any page role', () => {
    expect(assignMeasuredPages([], capacities)).toEqual({
      pages: [[]],
      oversizedItemIds: [],
    });
    const result = assignMeasuredPages(
      [{ id: 'tall', height: 101 }],
      capacities,
    );
    expect(ids(result.pages)).toEqual([['tall']]);
    expect(result.oversizedItemIds).toEqual(['tall']);
  });

  it('warns when the final intact row exceeds the final-page capacity', () => {
    const result = assignMeasuredPages(
      [
        { id: 'a', height: 60 },
        { id: 'b', height: 60 },
      ],
      capacities,
    );
    expect(ids(result.pages)).toEqual([['a'], ['b']]);
    expect(result.oversizedItemIds).toEqual(['b']);
  });

  it('recalculates deterministic breaks when measured row heights change', () => {
    const rows = [
      { id: 'a', height: 30 },
      { id: 'b', height: 30 },
      { id: 'c', height: 30 },
    ];
    expect(ids(assignMeasuredPages(rows, capacities).pages)).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
    expect(
      ids(
        assignMeasuredPages(
          rows.map((row) => ({ ...row, height: 40 })),
          capacities,
        ).pages,
      ),
    ).toEqual([['a', 'b'], ['c']]);
  });

  it('preserves stable row order without duplication or omission', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index}`,
      height: 35,
    }));
    const result = assignMeasuredPages(rows, capacities);
    expect(result.pages.flat().map((row) => row.id)).toEqual(
      rows.map((row) => row.id),
    );
    expect(assignMeasuredPages(rows, capacities)).toEqual(result);
  });
});
