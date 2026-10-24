import { describe, expect, it } from 'vitest';
import type { InvoiceArchiveEntry } from '../../src/shared/domain/issuedInvoice';
import { groupInvoiceArchiveEntries } from '../../src/renderer/components/invoiceArchiveGrouping';

const entries: InvoiceArchiveEntry[] = [
  {
    id: 'older-one',
    invoiceNumber: 'RE-3',
    customerLabel: 'Kunde Alpha',
    issueDate: '2025-12-31',
    dueDate: '2026-01-30',
    totalCents: '3100',
    currency: 'CHF',
    pdfAvailable: true,
  },
  {
    id: 'newer-two',
    invoiceNumber: 'RE-2',
    customerLabel: 'Kunde Alpha',
    issueDate: '2026-10-24',
    dueDate: '2026-11-23',
    totalCents: '2000',
    currency: 'EUR',
    pdfAvailable: false,
  },
  {
    id: 'newer-ten',
    invoiceNumber: 'RE-10',
    customerLabel: 'Kunde Alpha',
    issueDate: '2026-10-24',
    dueDate: '2026-12-01',
    totalCents: '10000',
    currency: 'CHF',
    pdfAvailable: true,
  },
  {
    id: 'middle-one',
    invoiceNumber: 'RE-1',
    customerLabel: 'Kunde Gamma',
    issueDate: '2026-03-15',
    dueDate: '2026-04-14',
    totalCents: '1000',
    currency: 'CHF',
    pdfAvailable: true,
  },
];

describe('groupInvoiceArchiveEntries', () => {
  it('orders invoice-date groups newest first and invoice numbers descending numerically', () => {
    const groups = groupInvoiceArchiveEntries(entries, '');

    expect(groups.map((group) => group.issueDate)).toEqual([
      '2026-10-24',
      '2026-03-15',
      '2025-12-31',
    ]);
    expect(groups[0]?.entries.map((entry) => entry.invoiceNumber)).toEqual([
      'RE-10',
      'RE-2',
    ]);
  });

  it('preserves archived fields and entry identity without mutating the input', () => {
    const originalOrder = [...entries];
    const groups = groupInvoiceArchiveEntries(entries, '');
    const sortedEntries = groups.flatMap((group) => group.entries);

    expect(sortedEntries).toHaveLength(entries.length);
    expect(sortedEntries.find((entry) => entry.id === 'newer-two')).toBe(
      entries[1],
    );
    expect(
      sortedEntries.find((entry) => entry.id === 'newer-two'),
    ).toMatchObject({
      dueDate: '2026-11-23',
      totalCents: '2000',
      currency: 'EUR',
      pdfAvailable: false,
    });
    expect(entries).toEqual(originalOrder);
  });

  it('searches invoice numbers and customer names without case sensitivity', () => {
    expect(
      groupInvoiceArchiveEntries(entries, 'rE-10').flatMap((group) =>
        group.entries.map((entry) => entry.id),
      ),
    ).toEqual(['newer-ten']);
    expect(
      groupInvoiceArchiveEntries(entries, 'kUnDe aLpHa').flatMap((group) =>
        group.entries.map((entry) => entry.id),
      ),
    ).toEqual(['newer-ten', 'newer-two', 'older-one']);
  });

  it('returns no date groups when there are no matches or no entries', () => {
    expect(groupInvoiceArchiveEntries(entries, 'not found')).toEqual([]);
    expect(groupInvoiceArchiveEntries([], '')).toEqual([]);
  });

  it('keeps dates and numeric order correct after filtering', () => {
    const filteredEntries = groupInvoiceArchiveEntries(entries, 'KUNDE ALPHA');

    expect(filteredEntries).toEqual([
      {
        issueDate: '2026-10-24',
        entries: [entries[2], entries[1]],
      },
      {
        issueDate: '2025-12-31',
        entries: [entries[0]],
      },
    ]);
  });
});
