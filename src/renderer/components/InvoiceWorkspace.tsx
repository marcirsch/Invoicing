import type { InvoiceDraft } from '../../shared/domain/invoice';
import type { Customer } from '../../shared/domain/customer';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { assignMeasuredPages } from '../invoice/assignMeasuredPages';
import {
  calculateLineAmount,
  calculateInvoiceTotal,
  formatCurrency,
} from '../../shared/invoice/money';

interface InvoiceWorkspaceProps {
  draft: InvoiceDraft | null;
  customers: Customer[];
  onChange(draft: Partial<InvoiceDraft>): void;
  onAddLine(): void;
  onResetDueDate(): void;
  error: string | null;
  printOnly?: boolean;
  onIssue?: (numberOverride: string) => void;
  issuing?: boolean;
  issueMessage?: string | null;
}

export function InvoiceWorkspace(props: InvoiceWorkspaceProps): JSX.Element {
  if (!props.draft)
    return (
      <section className="panel">
        <h2>Invoice draft</h2>
        <p>{props.error ?? 'Loading draft…'}</p>
      </section>
    );
  return <InvoiceWorkspaceContent {...props} draft={props.draft} />;
}

function InvoiceWorkspaceContent({
  draft,
  customers,
  onChange,
  onAddLine,
  onResetDueDate,
  error,
  printOnly = false,
  onIssue,
  issuing = false,
  issueMessage,
}: Omit<InvoiceWorkspaceProps, 'draft'> & {
  draft: InvoiceDraft;
}): JSX.Element {
  const total = calculateInvoiceTotal(draft.lines);
  const previewRef = useRef<HTMLDivElement>(null);
  const rowHeights = useRef(new Map<string, number>());
  const [pageLines, setPageLines] = useState([draft.lines]);
  const [oversizedLineIds, setOversizedLineIds] = useState<string[]>([]);
  const [footerTooTall, setFooterTooTall] = useState(false);
  const [numberOverride, setNumberOverride] = useState('');
  useLayoutEffect(() => setNumberOverride(''), [draft.id]);
  const contentKey = useMemo(
    () =>
      JSON.stringify([
        draft.lines,
        draft.sender,
        draft.customer,
        draft.notes,
        draft.invoiceFooter,
        draft.template,
      ]),
    [draft],
  );
  useLayoutEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const measure = () => {
      const paper = root.querySelector<HTMLElement>('.invoice-paper');
      if (!paper) return;
      const paperHeight = paper.getBoundingClientRect().height;
      const firstPage = root.querySelector<HTMLElement>('.invoice-paper');
      if (!firstPage) return;
      const innerHeight = paperHeight * (1 - 0.072 * 2);
      const regionHeight = (selector: string, page: HTMLElement | null) =>
        page
          ? Array.from(page.querySelectorAll<HTMLElement>(selector)).reduce(
              (sum, item) => sum + item.getBoundingClientRect().height,
              0,
            )
          : 0;
      const firstFixed = regionHeight(
        '.invoice-fixed:not(.preview-total):not(.invoice-notes)',
        firstPage,
      );
      const tableHeadingHeight =
        firstPage.querySelector('thead')?.getBoundingClientRect().height ?? 0;
      const closingPage = root.querySelector<HTMLElement>(
        '.invoice-paper:last-child',
      );
      const closingHeight = regionHeight(
        '.preview-total, .invoice-notes',
        closingPage,
      );
      const footerHeight = regionHeight('.invoice-footer', firstPage);
      const footerRegion = innerHeight * 0.22;
      setFooterTooTall(footerHeight > footerRegion);
      const commonReserved = tableHeadingHeight + footerHeight;
      const capacities = {
        first: innerHeight - firstFixed - commonReserved,
        firstFinal: innerHeight - firstFixed - commonReserved - closingHeight,
        continuation: innerHeight - commonReserved,
        final: innerHeight - commonReserved - closingHeight,
      };
      const assignment = assignMeasuredPages(
        draft.lines.map((line) => ({
          ...line,
          height: rowHeights.current.get(line.id) ?? 32,
        })),
        capacities,
      );
      setOversizedLineIds(assignment.oversizedItemIds);
      const pages = assignment.pages.map((rows) =>
        rows.map(({ height: _height, ...line }) => line),
      );
      setPageLines((current) =>
        JSON.stringify(current.map((rows) => rows.map((row) => row.id))) ===
        JSON.stringify(pages.map((rows) => rows.map((row) => row.id)))
          ? current
          : pages,
      );
    };
    root
      .querySelectorAll<HTMLElement>('[data-line-id]')
      .forEach((row) =>
        rowHeights.current.set(
          row.dataset.lineId!,
          row.getBoundingClientRect().height,
        ),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    document.fonts?.ready.then(measure);
    root.querySelectorAll('img').forEach((image) => {
      if (!image.complete)
        image.addEventListener('load', measure, { once: true });
    });
    return () => observer.disconnect();
  }, [contentKey, draft.lines]);
  return (
    <section
      className={
        printOnly ? 'invoice-workspace print-only' : 'invoice-workspace'
      }
    >
      {error && (
        <div className="error-banner" role="alert">
          <p>{error}</p>
        </div>
      )}
      <section className="panel invoice-editor">
        <h2>Invoice draft</h2>
        {issueMessage && <p role="status">{issueMessage}</p>}
        {onIssue && (
          <div className="issue-controls">
            <label className="field">
              Invoice number override
              <input
                value={numberOverride}
                maxLength={80}
                onChange={(event) => setNumberOverride(event.target.value)}
                placeholder={draft.suggestedNumber}
              />
            </label>
            <button
              type="button"
              disabled={issuing}
              onClick={() => {
                if (
                  window.confirm(
                    'Issue this invoice now? The issued PDF and snapshot are permanent.',
                  )
                )
                  onIssue(numberOverride);
              }}
            >
              {issuing ? 'Issuing…' : 'Issue invoice'}
            </button>
          </div>
        )}
        <div className="form-grid">
          <label className="field">
            Customer
            <select
              value={draft.customerId ?? ''}
              aria-label="Invoice customer"
              onChange={(event) => {
                const customer =
                  customers.find((item) => item.id === event.target.value) ??
                  null;
                onChange({ customerId: customer?.id ?? null, customer });
              }}
            >
              <option value="">Choose a customer</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Suggested invoice number
            <input readOnly value={draft.suggestedNumber} />
          </label>
          <label className="field">
            Invoice date
            <input
              type="date"
              value={draft.invoiceDate}
              onChange={(event) =>
                onChange({ invoiceDate: event.target.value })
              }
            />
          </label>
          <label className="field">
            Due date
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => onChange({ dueDate: event.target.value })}
            />
          </label>
          {draft.dueDateMode === 'manual' && (
            <button
              type="button"
              className="secondary"
              onClick={onResetDueDate}
            >
              Use payment term
            </button>
          )}
          <label className="field">
            Currency
            <select
              value={draft.currency}
              onChange={(event) =>
                onChange({ currency: event.target.value as 'CHF' | 'EUR' })
              }
            >
              <option>CHF</option>
              <option>EUR</option>
            </select>
          </label>
          <label className="field">
            Template
            <select
              value={draft.template}
              onChange={(event) =>
                onChange({
                  template: event.target.value as InvoiceDraft['template'],
                })
              }
            >
              <option value="classic">Classic</option>
              <option value="simple">Simple</option>
            </select>
          </label>
        </div>
        <h3>Services</h3>
        <div className="table-scroll service-table-scroll">
          <table className="service-table">
            <colgroup>
              <col className="service-description-column" />
              <col className="service-hours-column" />
              <col className="service-rate-column" />
              <col className="service-amount-column" />
              <col className="service-action-column" />
            </colgroup>
            <thead>
              <tr>
                <th>Description</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((line) => {
                const amount = calculateLineAmount(line.hours, line.rate);
                return (
                  <tr key={line.id}>
                    <td className="service-description-cell">
                      <input
                        aria-label="Service description"
                        value={line.description}
                        onChange={(event) =>
                          onChange({
                            lines: draft.lines.map((item) =>
                              item.id === line.id
                                ? { ...item, description: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="service-numeric-cell">
                      <input
                        aria-label="Hours"
                        inputMode="decimal"
                        value={line.hours}
                        onChange={(event) =>
                          onChange({
                            lines: draft.lines.map((item) =>
                              item.id === line.id
                                ? { ...item, hours: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="service-numeric-cell">
                      <input
                        aria-label="Rate"
                        inputMode="decimal"
                        value={line.rate}
                        onChange={(event) =>
                          onChange({
                            lines: draft.lines.map((item) =>
                              item.id === line.id
                                ? { ...item, rate: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="service-amount-cell">
                      {amount.valid
                        ? formatCurrency(amount.amount, draft.currency)
                        : '—'}
                    </td>
                    <td className="service-action-cell">
                      <button
                        type="button"
                        className="danger service-remove-button"
                        aria-label="Remove service row"
                        onClick={() =>
                          onChange({
                            lines: draft.lines.filter(
                              (item) => item.id !== line.id,
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="invoice-add-row-gap" />
        <button type="button" className="secondary" onClick={onAddLine}>
          Add row
        </button>
        <label className="field">
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </label>
      </section>
      <div
        className="invoice-pages"
        aria-label="Invoice preview"
        ref={previewRef}
      >
        {(footerTooTall || oversizedLineIds.length > 0) && (
          <div className="invoice-layout-warning" role="alert">
            {footerTooTall && (
              <p>
                The invoice footer is too tall to fit in the page footer area.
              </p>
            )}
            {oversizedLineIds.length > 0 && (
              <p>
                One or more service rows are taller than the available page area
                and may not fit without splitting.
              </p>
            )}
          </div>
        )}
        {pageLines.map((lines, pageIndex) => (
          <section
            key={pageIndex}
            className={`invoice-paper ${draft.template}`}
            aria-label={`Invoice preview page ${pageIndex + 1}`}
          >
            {pageIndex === 0 && (
              <header className="invoice-fixed">
                <div>
                  {pageIndex === 0 && (
                    <div className="invoice-logo-space">
                      {settingsLogo(draft.sender.logoDataUrl) && (
                        <img
                          className="invoice-logo"
                          src={settingsLogo(draft.sender.logoDataUrl)!}
                          alt="Company logo"
                        />
                      )}
                    </div>
                  )}
                  <strong className="invoice-sender-name">
                    {draft.sender.name || 'Your company'}
                  </strong>
                  <p className="invoice-sender-details">
                    {draft.sender.address.street}{' '}
                    {draft.sender.address.buildingNumber}
                    <br />
                    {draft.sender.address.postalCode}{' '}
                    {draft.sender.address.city}
                    {draft.sender.address.country && (
                      <>
                        <br />
                        {draft.sender.address.country}
                      </>
                    )}
                    {draft.sender.phone && (
                      <>
                        <br />
                        {draft.sender.phone}
                      </>
                    )}
                    {draft.sender.email && (
                      <>
                        <br />
                        {draft.sender.email}
                      </>
                    )}
                    {draft.sender.website && (
                      <>
                        <br />
                        {draft.sender.website}
                      </>
                    )}
                    {draft.sender.iban && (
                      <>
                        <br />
                        <b>IBAN: {draft.sender.iban}</b>
                      </>
                    )}
                    {draft.sender.bankName && (
                      <>
                        <br />
                        <b>Bank: {draft.sender.bankName}</b>
                      </>
                    )}
                  </p>
                </div>
                <div className="invoice-recipient-block">
                  <div className="preview-customer">
                    <strong>{draft.customer?.name ?? 'Customer'}</strong>
                    <p>
                      {draft.customer?.address.street}{' '}
                      {draft.customer?.address.buildingNumber}
                      <br />
                      {draft.customer?.address.postalCode}{' '}
                      {draft.customer?.address.city}
                      {draft.customer?.email && (
                        <>
                          <br />
                          {draft.customer.email}
                        </>
                      )}
                      {draft.customer?.phone && (
                        <>
                          <br />
                          {draft.customer.phone}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </header>
            )}
            {pageIndex === 0 && (
              <section className="invoice-fixed invoice-heading-block">
                <h2>RECHNUNG</h2>
                <div className="invoice-meta-grid">
                  <strong>Rechnungsdatum</strong>
                  <strong>{formatInvoiceDate(draft.invoiceDate)}</strong>
                  <strong>Zahlbar bis</strong>
                  <strong>{formatInvoiceDate(draft.dueDate)}</strong>
                  <strong>Rechnungsnummer</strong>
                  <strong>{draft.suggestedNumber}</strong>
                </div>
              </section>
            )}
            <table>
              <thead>
                <tr>
                  <th>POS.</th>
                  <th>BESCHREIBUNG</th>
                  <th>DATUM</th>
                  <th>STUNDEN</th>
                  <th>{draft.currency}/STD</th>
                  <th>PREIS IN {draft.currency}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const value = calculateLineAmount(line.hours, line.rate);
                  return (
                    <tr
                      key={line.id}
                      data-line-id={line.id}
                      ref={(node) => {
                        if (node)
                          rowHeights.current.set(
                            line.id,
                            node.getBoundingClientRect().height,
                          );
                      }}
                    >
                      <td className="invoice-position-cell">
                        {draft.lines.findIndex((item) => item.id === line.id) +
                          1}
                        .
                      </td>
                      <td>{line.description || 'Service'}</td>
                      <td>{formatInvoiceDate(draft.invoiceDate)}</td>
                      <td className="invoice-number-cell">{line.hours}</td>
                      <td className="invoice-number-cell">
                        {line.rate} {draft.currency}
                      </td>
                      <td className="invoice-number-cell">
                        {value.valid
                          ? `${formatInvoiceAmount(value.amount?.toNumber() ?? 0)} ${draft.currency}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pageIndex === pageLines.length - 1 && (
              <>
                <div className="preview-total invoice-fixed">
                  <strong>Gesamt total</strong>
                  <strong>
                    {total.valid
                      ? `${formatInvoiceAmount(total.amount?.toNumber() ?? 0)} ${draft.currency}`
                      : '—'}
                  </strong>
                </div>
                {draft.notes && (
                  <p className="invoice-fixed invoice-notes">{draft.notes}</p>
                )}
              </>
            )}
            {draft.invoiceFooter && (
              <footer className="invoice-footer">{draft.invoiceFooter}</footer>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

function settingsLogo(dataUrl: string | null | undefined): string | null {
  return dataUrl ?? null;
}

function formatInvoiceDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatInvoiceAmount(value: number): string {
  return new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 }).format(
    value,
  );
}
