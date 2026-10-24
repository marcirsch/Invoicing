import type { InvoiceArchiveEntry } from '../../shared/domain/issuedInvoice';

export interface InvoiceArchiveDateGroup {
  issueDate: string;
  entries: InvoiceArchiveEntry[];
}

const invoiceNumberCollator = new Intl.Collator('de-CH', {
  numeric: true,
  sensitivity: 'base',
});

/** Filters and orders archive entries for the date-grouped archive view. */
export function groupInvoiceArchiveEntries(
  entries: readonly InvoiceArchiveEntry[],
  query: string,
): InvoiceArchiveDateGroup[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('de-CH');
  const groups = new Map<string, InvoiceArchiveEntry[]>();

  for (const entry of entries) {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      entry.invoiceNumber
        .toLocaleLowerCase('de-CH')
        .includes(normalizedQuery) ||
      entry.customerLabel.toLocaleLowerCase('de-CH').includes(normalizedQuery);
    if (!matchesQuery) continue;

    const group = groups.get(entry.issueDate);
    if (group) group.push(entry);
    else groups.set(entry.issueDate, [entry]);
  }

  return [...groups.entries()]
    .sort(([leftDate], [rightDate]) =>
      leftDate === rightDate ? 0 : leftDate > rightDate ? -1 : 1,
    )
    .map(([issueDate, groupEntries]) => ({
      issueDate,
      entries: groupEntries.sort((left, right) =>
        invoiceNumberCollator.compare(right.invoiceNumber, left.invoiceNumber),
      ),
    }));
}
