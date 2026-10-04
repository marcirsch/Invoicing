import type { InvoiceDraft } from '../../shared/domain/invoice';
import type { Customer } from '../../shared/domain/customer';
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
  error,
}: {
  draft: InvoiceDraft | null;
  customers: Customer[];
  onChange(draft: Partial<InvoiceDraft>): void;
  onAddLine(): void;
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
        <div className="table-scroll">
          <table>
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
                    <td>
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
                    <td>
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
                    <td>
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
                    <td>
                      {amount.valid
                        ? formatCurrency(amount.amount, draft.currency)
                        : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="danger"
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
        <button type="button" className="secondary" onClick={onAddLine}>
          Add service row
        </button>
        <label className="field">
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </label>
      </section>
      <section
        className={`invoice-paper ${draft.template}`}
        aria-label="Invoice preview"
      >
        <header>
          <div>
            <strong>{draft.sender.name || 'Your company'}</strong>
            <p>
              {draft.sender.address.street}{' '}
              {draft.sender.address.buildingNumber}
              <br />
              {draft.sender.address.postalCode} {draft.sender.address.city}
            </p>
          </div>
          <h2>INVOICE</h2>
        </header>
        <div className="preview-customer">
          <strong>{draft.customer?.name ?? 'Customer'}</strong>
          <p>
            {draft.customer?.address.street}{' '}
            {draft.customer?.address.buildingNumber}
            <br />
            {draft.customer?.address.postalCode} {draft.customer?.address.city}
          </p>
        </div>
        <p>
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
            {draft.lines.map((line) => {
              const value = calculateLineAmount(line.hours, line.rate);
              return (
                <tr key={line.id}>
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
        <div className="preview-total">
          <strong>Total</strong>
          <strong>
            {total.valid ? formatCurrency(total.amount, draft.currency) : '—'}
          </strong>
        </div>
        {draft.notes && <p>{draft.notes}</p>}
      </section>
    </section>
  );
}
