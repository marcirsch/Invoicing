import type { InvoiceDraft } from '../../shared/domain/invoice';
import type { Customer } from '../../shared/domain/customer';
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { assignMeasuredPages } from '../invoice/assignMeasuredPages';
import { resolvePageLines } from '../invoice/resolvePageLines';
import { QrBillPreview } from './QrBillPreview';
import {
  calculateLineAmount,
  calculateInvoiceTotal,
  formatCurrency,
} from '../../shared/invoice/money';
import {
  validateIssueDraft,
  type IssueIssue,
} from '../../shared/invoice/issueValidation';
import { createInvoiceNumberProposal } from '../../shared/invoice/numbering';
import type { Settings } from '../../shared/domain/settings';

interface InvoiceWorkspaceProps {
  draft: InvoiceDraft | null;
  customers: Customer[];
  onChange(draft: Partial<InvoiceDraft>): void;
  onAddLine(): void;
  onResetDueDate(): void;
  settings?: Pick<Settings, 'invoicePrefix' | 'invoiceYear' | 'nextSequence'>;
  error: string | null;
  printOnly?: boolean;
  onIssue?: () => void;
  issuing?: boolean;
  issueMessage?: string | null;
  issueIssues?: IssueIssue[];
  onOpenSettings?: () => void;
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
  settings,
  error,
  printOnly = false,
  onIssue,
  issuing = false,
  issueMessage,
  issueIssues = [],
  onOpenSettings,
}: Omit<InvoiceWorkspaceProps, 'draft'> & {
  draft: InvoiceDraft;
}): JSX.Element {
  const total = calculateInvoiceTotal(draft.lines);
  const previewRef = useRef<HTMLDivElement>(null);
  const rowHeights = useRef(new Map<string, number>());
  const [pageLineIds, setPageLineIds] = useState([
    draft.lines.map((line) => line.id),
  ]);
  const pageLines = resolvePageLines(pageLineIds, draft.lines);
  const [oversizedLineIds, setOversizedLineIds] = useState<string[]>([]);
  const [footerTooTall, setFooterTooTall] = useState(false);
  const [attemptedDraftId, setAttemptedDraftId] = useState<string | null>(null);
  const [focusAttempt, setFocusAttempt] = useState(0);
  const focusedAttempt = useRef(0);
  const focusInsertedRow = useRef(false);
  const issueAttempted = attemptedDraftId === draft.id;
  const proposal = settings
    ? createInvoiceNumberProposal(settings)
    : draft.suggestedNumber;
  const currentIssues =
    printOnly || !issueAttempted ? [] : validateIssueDraft(draft).issues;
  const liveIssues = [
    ...currentIssues,
    ...issueIssues.filter(
      (serverIssue) =>
        currentIssues.some(
          (currentIssue) => currentIssue.field === serverIssue.field,
        ) &&
        !currentIssues.some(
          (currentIssue) =>
            currentIssue.field === serverIssue.field &&
            currentIssue.message === serverIssue.message,
        ),
    ),
  ];
  const summaryIssues = liveIssues.filter(
    (item) => !item.field.startsWith('lines.') && item.field !== 'lines',
  );
  const issueFor = (field: string) =>
    liveIssues.find((item) => item.field === field)?.message;
  const lineIssue = (lineId: string, field: string) => {
    const index = draft.lines.findIndex((line) => line.id === lineId);
    return (
      issueFor(`lines.${index}.${field}`) ??
      (field !== 'description' ? issueFor(`lines.${index}`) : undefined)
    );
  };
  useLayoutEffect(() => {
    if (
      !issueAttempted ||
      focusAttempt === 0 ||
      focusedAttempt.current === focusAttempt
    )
      return;
    if (focusInsertedRow.current) {
      if (draft.lines.length === 0) return;
      focusedAttempt.current = focusAttempt;
      focusInsertedRow.current = false;
      const insertedLine = draft.lines.at(-1);
      if (insertedLine)
        document.getElementById(`line-${insertedLine.id}-description`)?.focus();
      return;
    }
    focusedAttempt.current = focusAttempt;
    const first = currentIssues.find(
      (item) =>
        item.field === 'customer' ||
        item.field.startsWith('customer.') ||
        item.field === 'invoiceDate' ||
        item.field === 'dueDate' ||
        item.field === 'invoiceNumber' ||
        item.field.startsWith('lines.'),
    )?.field;
    const lineMatch = first?.match(
      /^lines\.(\d+)(?:\.(description|hours|rate))?$/,
    );
    const id = lineMatch
      ? `line-${draft.lines[Number(lineMatch[1])]?.id ?? ''}-${lineMatch[2] ?? 'hours'}`
      : first === 'customer' || first?.startsWith('customer.')
        ? 'invoice-customer'
        : first === 'invoiceDate'
          ? 'invoice-date'
          : first === 'dueDate'
            ? 'due-date'
            : first === 'invoiceNumber'
              ? 'invoice-number'
              : null;
    if (id) document.getElementById(id)?.focus();
  }, [currentIssues, draft.lines, focusAttempt, issueAttempted]);
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
      const paper = root.querySelector<HTMLElement>('.invoice-page');
      if (!paper) return;
      const paperHeight = paper.getBoundingClientRect().height;
      const firstPage = root.querySelector<HTMLElement>('.invoice-page');
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
      const closingPage =
        Array.from(root.querySelectorAll<HTMLElement>('.invoice-page')).at(
          -1,
        ) ?? null;
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
      setPageLineIds((current) =>
        JSON.stringify(current) ===
        JSON.stringify(pages.map((rows) => rows.map((row) => row.id)))
          ? current
          : pages.map((rows) => rows.map((row) => row.id)),
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
        {summaryIssues.length > 0 && (
          <div className="issue-summary" role="alert">
            <strong>
              {summaryIssues.length} issue
              {summaryIssues.length === 1 ? '' : 's'} need attention before
              issuing.
            </strong>
            <ul>
              {summaryIssues.map((item, index) => (
                <li key={`${item.field}-${item.message}-${index}`}>
                  {item.field.startsWith('lines.') || item.field === 'lines'
                    ? `Services: ${item.message}`
                    : item.field === 'total'
                      ? `Invoice total (check service hours and rates): ${item.message}`
                      : `${item.field.startsWith('sender.') ? 'Company details' : item.field === 'customer' || item.field.startsWith('customer.') ? 'Customer' : item.field === 'invoiceDate' ? 'Invoice date' : item.field === 'dueDate' ? 'Due date' : item.field === 'invoiceNumber' ? 'Invoice number' : item.field}: ${item.message}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {liveIssues.some((item) => item.field.startsWith('sender.')) && (
          <p className="field-error">
            Company details need attention.{' '}
            <button
              type="button"
              className="text-button"
              onClick={onOpenSettings}
            >
              Open Settings
            </button>
          </p>
        )}
        {onIssue && (
          <div className="issue-controls">
            <button
              type="button"
              disabled={issuing}
              onClick={() => {
                if (
                  window.confirm(
                    'Issue this invoice now? The issued PDF and snapshot are permanent.',
                  )
                ) {
                  setAttemptedDraftId(draft.id);
                  setFocusAttempt((attempt) => attempt + 1);
                  if (draft.lines.length === 0) {
                    focusInsertedRow.current = true;
                    onAddLine();
                    return;
                  }
                  if (validateIssueDraft(draft).valid) onIssue();
                }
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
              id="invoice-customer"
              aria-invalid={Boolean(issueFor('customer'))}
              aria-describedby={
                issueFor('customer') ? 'invoice-customer-error' : undefined
              }
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
            {issueFor('customer') && (
              <span id="invoice-customer-error" className="field-error">
                {issueFor('customer')}
              </span>
            )}
          </label>
          <div className="field">
            <label htmlFor="invoice-number">Invoice number</label>
            <input
              id="invoice-number"
              value={draft.suggestedNumber}
              aria-invalid={Boolean(issueFor('invoiceNumber'))}
              aria-describedby={
                issueFor('invoiceNumber') ? 'invoice-number-error' : undefined
              }
              maxLength={80}
              onChange={(event) =>
                onChange({ suggestedNumber: event.target.value })
              }
            />
            {issueFor('invoiceNumber') && (
              <span id="invoice-number-error" className="field-error">
                {issueFor('invoiceNumber')}
              </span>
            )}
            <div className="invoice-number-proposal">
              <span>
                Proposal: <strong>{proposal}</strong>
              </span>
              <button
                type="button"
                className="proposal-action"
                disabled={draft.suggestedNumber === proposal}
                onClick={() => onChange({ suggestedNumber: proposal })}
              >
                Use proposal
              </button>
            </div>
          </div>
          <label className="field">
            Invoice date
            <input
              id="invoice-date"
              aria-invalid={Boolean(issueFor('invoiceDate'))}
              aria-describedby={
                issueFor('invoiceDate') ? 'invoice-date-error' : undefined
              }
              type="date"
              value={draft.invoiceDate}
              onChange={(event) =>
                onChange({ invoiceDate: event.target.value })
              }
            />
            {issueFor('invoiceDate') && (
              <span id="invoice-date-error" className="field-error">
                {issueFor('invoiceDate')}
              </span>
            )}
          </label>
          <label className="field">
            Due date
            <input
              id="due-date"
              aria-invalid={Boolean(issueFor('dueDate'))}
              aria-describedby={
                issueFor('dueDate') ? 'due-date-error' : undefined
              }
              type="date"
              value={draft.dueDate}
              onChange={(event) => onChange({ dueDate: event.target.value })}
            />
            {issueFor('dueDate') && (
              <span id="due-date-error" className="field-error">
                {issueFor('dueDate')}
              </span>
            )}
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
                  <Fragment key={line.id}>
                    <tr>
                      <td className="service-description-cell">
                        <input
                          id={`line-${line.id}-description`}
                          aria-invalid={Boolean(
                            lineIssue(line.id, 'description'),
                          )}
                          aria-describedby={
                            lineIssue(line.id, 'description')
                              ? `line-${line.id}-description-error`
                              : undefined
                          }
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
                        {lineIssue(line.id, 'description') && (
                          <span
                            id={`line-${line.id}-description-error`}
                            className="visually-hidden"
                          >
                            {lineIssue(line.id, 'description')}
                          </span>
                        )}
                      </td>
                      <td className="service-numeric-cell">
                        <input
                          id={`line-${line.id}-hours`}
                          aria-invalid={Boolean(lineIssue(line.id, 'hours'))}
                          aria-describedby={
                            lineIssue(line.id, 'hours')
                              ? `line-${line.id}-hours-error`
                              : undefined
                          }
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
                        {lineIssue(line.id, 'hours') && (
                          <span
                            id={`line-${line.id}-hours-error`}
                            className="visually-hidden"
                          >
                            {lineIssue(line.id, 'hours')}
                          </span>
                        )}
                      </td>
                      <td className="service-numeric-cell">
                        <input
                          id={`line-${line.id}-rate`}
                          aria-invalid={Boolean(lineIssue(line.id, 'rate'))}
                          aria-describedby={
                            lineIssue(line.id, 'rate')
                              ? `line-${line.id}-rate-error`
                              : undefined
                          }
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
                        {lineIssue(line.id, 'rate') && (
                          <span
                            id={`line-${line.id}-rate-error`}
                            className="visually-hidden"
                          >
                            {lineIssue(line.id, 'rate')}
                          </span>
                        )}
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
                  </Fragment>
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
            className={`invoice-paper invoice-page ${draft.template}`}
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
                    <PreviewTarget
                      fieldId="invoice-customer"
                      label="Select invoice customer"
                      printOnly={printOnly}
                    >
                      <strong>{draft.customer?.name ?? 'Customer'}</strong>
                    </PreviewTarget>
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
                  <PreviewTarget
                    fieldId="invoice-date"
                    label="Invoice date"
                    printOnly={printOnly}
                  >
                    <strong>{formatInvoiceDate(draft.invoiceDate)}</strong>
                  </PreviewTarget>
                  <strong>Zahlbar bis</strong>
                  <PreviewTarget
                    fieldId="due-date"
                    label="Due date"
                    printOnly={printOnly}
                  >
                    <strong>{formatInvoiceDate(draft.dueDate)}</strong>
                  </PreviewTarget>
                  <strong>Rechnungsnummer</strong>
                  <PreviewTarget
                    fieldId="invoice-number"
                    label="Invoice number"
                    printOnly={printOnly}
                  >
                    <strong>{draft.suggestedNumber}</strong>
                  </PreviewTarget>
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
                      <td>
                        <PreviewTarget
                          fieldId={`line-${line.id}-description`}
                          label={`Edit description for service ${draft.lines.findIndex((item) => item.id === line.id) + 1}`}
                          printOnly={printOnly}
                        >
                          {line.description || 'Service'}
                        </PreviewTarget>
                      </td>
                      <td>{formatInvoiceDate(draft.invoiceDate)}</td>
                      <td className="invoice-number-cell">
                        <PreviewTarget
                          fieldId={`line-${line.id}-hours`}
                          label={`Edit hours for service ${draft.lines.findIndex((item) => item.id === line.id) + 1}`}
                          printOnly={printOnly}
                        >
                          {line.hours}
                        </PreviewTarget>
                      </td>
                      <td className="invoice-number-cell">
                        <PreviewTarget
                          fieldId={`line-${line.id}-rate`}
                          label={`Edit rate for service ${draft.lines.findIndex((item) => item.id === line.id) + 1}`}
                          printOnly={printOnly}
                        >
                          {line.rate} {draft.currency}
                        </PreviewTarget>
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
        {!printOnly && (
          <QrBillPreview draft={draft} invoiceNumber={draft.suggestedNumber} />
        )}
      </div>
    </section>
  );
}

function settingsLogo(dataUrl: string | null | undefined): string | null {
  return dataUrl ?? null;
}

function PreviewTarget({
  fieldId,
  label,
  children,
  printOnly = false,
}: {
  fieldId: string;
  label: string;
  children: import('react').ReactNode;
  printOnly?: boolean;
}): JSX.Element {
  if (printOnly) return <>{children}</>;
  return (
    <button
      type="button"
      className="preview-target"
      aria-label={label}
      onClick={() => {
        const field = document.getElementById(fieldId);
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field?.focus();
      }}
    >
      {children}
    </button>
  );
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
