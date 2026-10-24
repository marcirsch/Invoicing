import { useEffect, useState } from 'react';
import type {
  InvoiceArchiveEntry,
  IssuedInvoice,
} from '../../shared/domain/issuedInvoice';
import { groupInvoiceArchiveEntries } from './invoiceArchiveGrouping';

export function InvoiceArchive({
  onReplace,
}: {
  onReplace(id: string): void;
}): JSX.Element {
  const [entries, setEntries] = useState<InvoiceArchiveEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IssuedInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const groups = groupInvoiceArchiveEntries(entries, searchQuery);
  const visibleEntries = groups.flatMap((group) => group.entries);
  const missingPdfCount = visibleEntries.filter(
    (entry) => !entry.pdfAvailable,
  ).length;
  let sequence = 0;

  return (
    <section
      className="panel invoice-archive"
      aria-labelledby="archive-heading"
    >
      <header className="archive-heading">
        <div>
          <h2 id="archive-heading">Issued invoices</h2>
          <p>Grouped by invoice date, newest first.</p>
        </div>
        {entries.length > 0 && (
          <p className="archive-count" aria-live="polite">
            {visibleEntries.length}{' '}
            {visibleEntries.length === 1 ? 'invoice' : 'invoices'} ·{' '}
            {missingPdfCount} {missingPdfCount === 1 ? 'PDF' : 'PDFs'} missing
          </p>
        )}
      </header>

      {error && <p role="alert">{error}</p>}
      {entries.length === 0 && !error && <p>No issued invoices yet.</p>}

      {entries.length > 0 && (
        <>
          <div className="archive-search">
            <label htmlFor="archive-search">Search invoices</label>
            <input
              id="archive-search"
              type="search"
              value={searchQuery}
              placeholder="Invoice number or customer"
              autoComplete="off"
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
            />
          </div>

          <div
            className="archive-date-groups"
            aria-label="Invoices grouped by invoice date, newest first"
          >
            {groups.map((group) => {
              const headingId = `archive-date-${group.issueDate}`;
              return (
                <section
                  className="archive-date-group"
                  key={group.issueDate}
                  aria-labelledby={headingId}
                >
                  <header className="archive-date-heading">
                    <span className="archive-date-marker" aria-hidden="true" />
                    <div className="archive-date-label">
                      <span className="archive-field-label">Invoice date</span>
                      <h3 id={headingId}>
                        <time dateTime={group.issueDate}>
                          {group.issueDate}
                        </time>
                      </h3>
                    </div>
                    <span className="archive-group-count">
                      {group.entries.length}{' '}
                      {group.entries.length === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </header>

                  <ol
                    className="archive-rows"
                    tabIndex={0}
                    aria-label={`Invoices for invoice date ${group.issueDate}; scroll horizontally to view all fields`}
                  >
                    {group.entries.map((entry) => {
                      sequence += 1;
                      const invoiceHeadingId = `archive-invoice-${entry.id}`;
                      return (
                        <li className="archive-row-item" key={entry.id}>
                          <article
                            className="archive-invoice-row"
                            aria-labelledby={invoiceHeadingId}
                          >
                            <span
                              className="archive-sequence"
                              aria-label={`Position ${sequence} of ${visibleEntries.length}`}
                            >
                              {String(sequence).padStart(2, '0')}
                            </span>

                            <div className="archive-row-identity">
                              <h4
                                className="archive-invoice-number"
                                id={invoiceHeadingId}
                              >
                                {entry.invoiceNumber}
                              </h4>
                              <strong className="archive-customer-name">
                                {entry.customerLabel}
                              </strong>
                            </div>

                            <div className="archive-row-field">
                              <span className="archive-field-label">
                                Due date
                              </span>
                              <time
                                className="archive-due-date"
                                dateTime={entry.dueDate}
                              >
                                {entry.dueDate}
                              </time>
                            </div>

                            <div className="archive-row-field">
                              <span className="archive-field-label">Total</span>
                              <strong className="archive-total">
                                {(
                                  Number(entry.totalCents) / 100
                                ).toLocaleString('de-CH', {
                                  style: 'currency',
                                  currency: entry.currency,
                                })}
                              </strong>
                            </div>

                            <div className="archive-row-field">
                              <span className="archive-field-label">PDF</span>
                              <span
                                className={`archive-pdf-status ${entry.pdfAvailable ? 'is-available' : 'is-missing'}`}
                              >
                                {entry.pdfAvailable ? 'Available' : 'Missing'}
                              </span>
                            </div>

                            <div className="archive-row-actions">
                              <button
                                type="button"
                                className="archive-open-pdf"
                                disabled={!entry.pdfAvailable}
                                onClick={() =>
                                  void window.invoicing.openInvoicePdf(entry.id)
                                }
                              >
                                Open PDF
                              </button>
                              <details className="archive-action-menu">
                                <summary>Actions</summary>
                                <div className="archive-menu-content">
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => void showDetails(entry.id)}
                                  >
                                    Details
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary"
                                    disabled={!entry.pdfAvailable}
                                    onClick={() =>
                                      void window.invoicing.revealInvoicePdf(
                                        entry.id,
                                      )
                                    }
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
                              </details>
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
            {groups.length === 0 && (
              <p className="archive-no-results" role="status">
                No matching invoices.
              </p>
            )}
          </div>
        </>
      )}

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
