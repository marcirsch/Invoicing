import { useEffect, useLayoutEffect, useState } from 'react';
import type {
  InvoiceArchiveEntry,
  IssuedInvoice,
} from '../../shared/domain/issuedInvoice';
import { groupInvoiceArchiveEntries } from './invoiceArchiveGrouping';

function showArchiveActionsPopover(
  popover: HTMLElement,
  trigger: HTMLButtonElement,
  onDismiss: () => void,
): void {
  popover.style.left = '0px';
  popover.style.top = '0px';
  popover.showPopover();

  const positionPopover = () => {
    if (!popover.matches(':popover-open')) return;

    const triggerBounds = trigger.getBoundingClientRect();
    const popoverBounds = popover.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 4;
    const maxLeft = Math.max(
      viewportPadding,
      window.innerWidth - popoverBounds.width - viewportPadding,
    );
    let left = triggerBounds.right - popoverBounds.width;
    if (left < viewportPadding) left = triggerBounds.left;
    left = Math.min(Math.max(left, viewportPadding), maxLeft);

    const maxTop = Math.max(
      viewportPadding,
      window.innerHeight - popoverBounds.height - viewportPadding,
    );
    let top = triggerBounds.bottom + gap;
    if (top > maxTop) top = triggerBounds.top - popoverBounds.height - gap;
    top = Math.min(Math.max(top, viewportPadding), maxTop);

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };

  const removePositionListeners = () => {
    window.removeEventListener('scroll', positionPopover, true);
    window.removeEventListener('resize', positionPopover);
    popover.removeEventListener('toggle', handleToggle);
  };
  const handleToggle = () => {
    if (!popover.matches(':popover-open')) {
      if (popover.contains(document.activeElement)) trigger.focus();
      removePositionListeners();
      onDismiss();
    }
  };

  positionPopover();
  window.addEventListener('scroll', positionPopover, true);
  window.addEventListener('resize', positionPopover);
  popover.addEventListener('toggle', handleToggle);
}

export function InvoiceArchive({
  onReplace,
}: {
  onReplace(id: string): void;
}): JSX.Element {
  const [entries, setEntries] = useState<InvoiceArchiveEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IssuedInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  useLayoutEffect(() => {
    const closeOpenPopovers = () => {
      document
        .querySelectorAll<HTMLElement>('.archive-menu-content:popover-open')
        .forEach((popover) => popover.hidePopover());
    };

    closeOpenPopovers();
    return closeOpenPopovers;
  }, []);
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
  useLayoutEffect(() => {
    if (openActionsId === null) return;

    const encodedId = encodeURIComponent(openActionsId);
    const popover = document.getElementById(`archive-actions-${encodedId}`);
    const trigger = document.getElementById(
      `archive-actions-trigger-${encodedId}`,
    ) as HTMLButtonElement | null;
    if (!popover || !trigger) return;

    showArchiveActionsPopover(popover, trigger, () => {
      setOpenActionsId((currentId) =>
        currentId === openActionsId ? null : currentId,
      );
    });

    return () => {
      if (popover.matches(':popover-open')) popover.hidePopover();
    };
  }, [openActionsId]);

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
                      const actionsPopoverId = `archive-actions-${encodeURIComponent(entry.id)}`;
                      const isActionsOpen = openActionsId === entry.id;
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
                              <div className="archive-identity-field">
                                <span className="archive-field-label">
                                  INVOICE
                                </span>
                                <h4
                                  className="archive-invoice-number"
                                  id={invoiceHeadingId}
                                >
                                  {entry.invoiceNumber}
                                </h4>
                              </div>
                              <div className="archive-identity-field">
                                <span className="archive-field-label">
                                  CUSTOMER
                                </span>
                                <strong className="archive-customer-name">
                                  {entry.customerLabel}
                                </strong>
                              </div>
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
                              <div className="archive-action-menu">
                                <button
                                  type="button"
                                  className="archive-actions-trigger"
                                  id={`archive-actions-trigger-${encodeURIComponent(entry.id)}`}
                                  aria-controls={
                                    isActionsOpen ? actionsPopoverId : undefined
                                  }
                                  aria-expanded={isActionsOpen}
                                  aria-label={`Actions for invoice ${entry.invoiceNumber}`}
                                  onClick={() =>
                                    setOpenActionsId((currentId) =>
                                      currentId === entry.id ? null : entry.id,
                                    )
                                  }
                                >
                                  <span>Actions</span>
                                  <svg
                                    className="archive-actions-chevron"
                                    aria-hidden="true"
                                    viewBox="0 0 12 12"
                                  >
                                    <path d="m2.5 4.5 3.5 3 3.5-3" />
                                  </svg>
                                </button>
                                {isActionsOpen && (
                                  <div
                                    className="archive-menu-content"
                                    id={actionsPopoverId}
                                    {...({ popover: 'auto' } as Record<
                                      string,
                                      string
                                    >)}
                                  >
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => {
                                        setOpenActionsId(null);
                                        void showDetails(entry.id);
                                      }}
                                    >
                                      Details
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary"
                                      disabled={!entry.pdfAvailable}
                                      onClick={() => {
                                        setOpenActionsId(null);
                                        void window.invoicing.revealInvoicePdf(
                                          entry.id,
                                        );
                                      }}
                                    >
                                      Reveal PDF
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => {
                                        setOpenActionsId(null);
                                        onReplace(entry.id);
                                      }}
                                    >
                                      Create replacement
                                    </button>
                                  </div>
                                )}
                              </div>
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
