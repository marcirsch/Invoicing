import { useEffect, useState } from 'react';
import type {
  InvoiceArchiveEntry,
  IssuedInvoice,
} from '../../shared/domain/issuedInvoice';

export function InvoiceArchive({
  onReplace,
}: {
  onReplace(id: string): void;
}): JSX.Element {
  const [entries, setEntries] = useState<InvoiceArchiveEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IssuedInvoice | null>(null);
  async function refresh() {
    const result = await window.invoicing.listInvoices();
    if (result.ok) {
      setEntries(result.value);
      setError(null);
    } else setError(result.error.message);
  }
  async function showDetails(id: string) {
    const result = await window.invoicing.readInvoice(id);
    if (result.ok) {
      setSelected(result.value);
      setError(null);
    } else setError(result.error.message);
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section className="panel">
      <h2>Issued invoices</h2>
      {error && <p role="alert">{error}</p>}
      {entries.length === 0 && !error && <p>No issued invoices yet.</p>}
      <div className="archive-list">
        {entries.map((entry) => (
          <article className="archive-entry" key={entry.id}>
            <div>
              <strong>{entry.invoiceNumber}</strong>
              <p>
                {entry.customerLabel} · {entry.issueDate} ·{' '}
                {(Number(entry.totalCents) / 100).toLocaleString('de-CH', {
                  style: 'currency',
                  currency: entry.currency,
                })}
              </p>
              {!entry.pdfAvailable && (
                <p role="status">
                  PDF is unavailable. Check the archive folder.
                </p>
              )}
            </div>
            <div className="button-row">
              <button
                type="button"
                className="secondary"
                onClick={() => void showDetails(entry.id)}
              >
                Details
              </button>
              <button
                type="button"
                disabled={!entry.pdfAvailable}
                onClick={() => void window.invoicing.openInvoicePdf(entry.id)}
              >
                Open PDF
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!entry.pdfAvailable}
                onClick={() => void window.invoicing.revealInvoicePdf(entry.id)}
              >
                Reveal PDF
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => onReplace(entry.id)}
              >
                Create replacement
              </button>
            </div>
          </article>
        ))}
      </div>
      {selected && (
        <section className="panel" aria-labelledby="archive-detail-heading">
          <h3 id="archive-detail-heading">Invoice {selected.invoiceNumber}</h3>
          <p>
            Issued {new Date(selected.issuedAt).toLocaleString('de-CH')} ·
            Invoice date {selected.invoiceDate} · Due {selected.dueDate}
          </p>
          <p>
            {selected.sender.name} → {selected.recipient.name}
          </p>
          <ul>
            {selected.lines.map((line, index) => (
              <li key={line.id}>
                {line.description}:{' '}
                {(Number(selected.lineTotalsCents[index]) / 100).toLocaleString(
                  'de-CH',
                  {
                    style: 'currency',
                    currency: selected.currency,
                  },
                )}
              </li>
            ))}
          </ul>
          <strong>
            Total:{' '}
            {(Number(selected.totalCents) / 100).toLocaleString('de-CH', {
              style: 'currency',
              currency: selected.currency,
            })}
          </strong>
          {selected.notes && <p>Notes: {selected.notes}</p>}
          {selected.replacesInvoiceId && (
            <p>Replaces archived invoice {selected.replacesInvoiceId}</p>
          )}
        </section>
      )}
    </section>
  );
}
