import type { InvoiceDraft } from '../../shared/domain/invoice';
import type { Customer } from '../../shared/domain/customer';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { assignMeasuredPages } from '../invoice/assignMeasuredPages';
import {
  calculateLineAmount,
  calculateInvoiceTotal,
  formatCurrency,
} from '../../shared/invoice/money';

export function InvoiceWorkspace({
  draft,
  customers,
  onChange,
  onAddLine,
  onResetDueDate,
  error,
}: {
  draft: InvoiceDraft | null;
  customers: Customer[];
  onChange(draft: Partial<InvoiceDraft>): void;
  onAddLine(): void;
  onResetDueDate(): void;
  error: string | null;
}): JSX.Element {
  if (!draft)
    return (
      <section className="panel">
        <h2>Invoice draft</h2>
        <p>{error ?? 'Loading draft…'}</p>
      </section>
    );
  const total = calculateInvoiceTotal(draft.lines);
  const previewRef = useRef<HTMLDivElement>(null);
  const rowHeights = useRef(new Map<string, number>());
  const [pageLines, setPageLines] = useState([draft.lines]);
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
      const fixedHeight = Array.from(
        firstPage?.querySelectorAll<HTMLElement>(
          '.invoice-fixed:not(.preview-total):not(.invoice-notes)',
        ) ?? [],
      ).reduce((sum, item) => sum + item.getBoundingClientRect().height, 0);
      const tableHeadingHeight =
        firstPage?.querySelector('thead')?.getBoundingClientRect().height ?? 0;
      const closingPage = root.querySelector<HTMLElement>(
        '.invoice-paper:last-child',
      );
      const closingHeight = closingPage
        ? Array.from(
            closingPage.querySelectorAll<HTMLElement>(
              '.preview-total, .invoice-notes',
            ),
          ).reduce((sum, item) => sum + item.getBoundingClientRect().height, 0)
        : 0;
      const footerHeight =
        firstPage
          ?.querySelector<HTMLElement>('.invoice-footer')
          ?.getBoundingClientRect().height ?? 0;
      const available = Math.max(
        120,
        paperHeight -
          fixedHeight -
          tableHeadingHeight -
          closingHeight -
          footerHeight -
          paperHeight * 0.14,
      );
      const pages = assignMeasuredPages(
        draft.lines.map((line) => ({
          ...line,
          height: rowHeights.current.get(line.id) ?? 32,
        })),
        available,
      ).map((rows) => rows.map(({ height: _height, ...line }) => line));
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
    <section className="invoice-workspace">
      {error && (
        <div className="error-banner" role="alert">
          <p>{error}</p>
        </div>
      )}
      <section className="panel invoice-editor">
        <h2>Invoice draft</h2>
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
        {pageLines.map((lines, pageIndex) => (
          <section
            key={pageIndex}
            className={`invoice-paper ${draft.template}`}
            aria-label={`Invoice preview page ${pageIndex + 1}`}
          >
            <header
              className={`invoice-fixed ${pageIndex > 0 ? 'invoice-continuation-header' : ''}`}
            >
              <div>
                {pageIndex === 0 && settingsLogo(draft.sender.logoDataUrl) && (
                  <img
                    className="invoice-logo"
                    src={settingsLogo(draft.sender.logoDataUrl)!}
                    alt="Company logo"
                  />
                )}
                <strong>{draft.sender.name || 'Your company'}</strong>
                <p>
                  {draft.sender.address.street}{' '}
                  {draft.sender.address.buildingNumber}
                  <br />
                  {draft.sender.address.postalCode} {draft.sender.address.city}
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
                      IBAN: {draft.sender.iban}
                    </>
                  )}
                  {draft.sender.bankName && (
                    <>
                      <br />
                      {draft.sender.bankName}
                    </>
                  )}
                </p>
              </div>
              <div className="invoice-recipient-block">
                <h2>{pageIndex === 0 ? 'INVOICE' : 'INVOICE · CONTINUED'}</h2>
                <div className="preview-customer">
                  <strong>{draft.customer?.name ?? 'Customer'}</strong>
                  <p>
                    {draft.customer?.address.street}{' '}
                    {draft.customer?.address.buildingNumber}
                    <br />
                    {draft.customer?.address.postalCode}{' '}
                    {draft.customer?.address.city}
                  </p>
                </div>
              </div>
            </header>
            <p className="invoice-fixed invoice-identity">
              <b>{draft.suggestedNumber}</b>
              <span>
                Invoice date: {draft.invoiceDate} · Due: {draft.dueDate}
              </span>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Amount</th>
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
                      <td>{line.description || 'Service'}</td>
                      <td>{line.hours}</td>
                      <td>{line.rate}</td>
                      <td>
                        {value.valid
                          ? formatCurrency(value.amount, draft.currency)
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
                  <strong>Total</strong>
                  <strong>
                    {total.valid
                      ? formatCurrency(total.amount, draft.currency)
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
