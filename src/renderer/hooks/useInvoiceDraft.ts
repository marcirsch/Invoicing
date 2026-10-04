import { useEffect, useState } from 'react';
import type { Customer } from '../../shared/domain/customer';
import type {
  InvoiceDraft,
  InvoiceLineItem,
} from '../../shared/domain/invoice';
import type { Settings } from '../../shared/domain/settings';
import { addCalendarDays } from '../../shared/invoice/dates';

function createDraft(settings: Settings, customers: Customer[]): InvoiceDraft {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const customer = customers[0] ?? null;
  return {
    id: crypto.randomUUID(),
    invoiceDate: date,
    dueDate: addCalendarDays(date, settings.paymentTermDays),
    currency: settings.currency,
    suggestedNumber: `${settings.invoicePrefix}${settings.invoiceYear}-${String(settings.nextSequence).padStart(3, '0')}`,
    customerId: customer?.id ?? null,
    customer,
    sender: settings.company,
    lines: [],
    template: 'classic',
    notes: '',
  };
}
export function useInvoiceDraft(
  settings: Settings,
  customers: Customer[],
  ready: boolean,
) {
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void window.invoicing.loadDraft().then((result) => {
      if (!active) return;
      if (result.ok) setDraft(result.value ?? createDraft(settings, customers));
      else setError(result.error.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [ready]);
  useEffect(() => {
    if (!draft || loading || error) return;
    const timeout = window.setTimeout(() => {
      void window.invoicing.saveDraft(draft).then((result) => {
        if (!result.ok) setError(result.error.message);
      });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [draft, loading, error]);
  function update(change: Partial<InvoiceDraft>) {
    setDraft((current) => (current ? { ...current, ...change } : current));
  }
  function addLine() {
    const line: InvoiceLineItem = {
      id: crypto.randomUUID(),
      description: '',
      hours: '',
      rate: '',
    };
    update({ lines: [...(draft?.lines ?? []), line] });
  }
  return { draft, update, addLine, loading, error, setError };
}
