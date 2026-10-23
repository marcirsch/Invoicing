import { useEffect, useRef, useState } from 'react';
import type { Customer } from '../../shared/domain/customer';
import type {
  InvoiceDraft,
  InvoiceLineItem,
} from '../../shared/domain/invoice';
import type { Settings } from '../../shared/domain/settings';
import { addCalendarDays } from '../../shared/invoice/dates';
import { isIsoDate } from '../../shared/invoice/dates';
import { createInvoiceNumberProposal } from '../../shared/invoice/numbering';

function createDraft(settings: Settings, customers: Customer[]): InvoiceDraft {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const customer = customers[0] ?? null;
  return {
    id: crypto.randomUUID(),
    invoiceDate: date,
    dueDate: addCalendarDays(
      date,
      validPaymentTerm(settings.paymentTermDays)
        ? settings.paymentTermDays
        : 30,
    ),
    currency: settings.currency,
    suggestedNumber: createInvoiceNumberProposal(settings),
    customerId: customer?.id ?? null,
    customer,
    sender: settings.company,
    lines: [],
    template: 'classic',
    notes: '',
    invoiceFooter: settings.invoiceFooter,
    dueDateMode: 'automatic',
  };
}
function validPaymentTerm(days: number): boolean {
  return Number.isInteger(days) && days >= 0 && days <= 3650;
}
export function useInvoiceDraft(
  settings: Settings,
  customers: Customer[],
  ready: boolean,
) {
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousProposal = useRef<string | null>(null);
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
  const proposal = createInvoiceNumberProposal(settings);
  useEffect(() => {
    if (!ready || loading || error || !draft) return;
    const shouldReconcile =
      previousProposal.current === null ||
      previousProposal.current !== proposal;
    previousProposal.current = proposal;
    if (!shouldReconcile || draft.suggestedNumber === proposal) return;
    setDraft((current) =>
      current && current.suggestedNumber !== proposal
        ? { ...current, suggestedNumber: proposal }
        : current,
    );
  }, [ready, loading, error, draft, proposal]);
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
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...change };
      if (
        change.invoiceDate !== undefined &&
        change.invoiceDate !== current.invoiceDate &&
        current.dueDateMode === 'automatic' &&
        isIsoDate(change.invoiceDate) &&
        validPaymentTerm(settings.paymentTermDays)
      )
        next.dueDate = addCalendarDays(
          change.invoiceDate,
          settings.paymentTermDays,
        );
      if (change.dueDate !== undefined && change.dueDate !== current.dueDate)
        next.dueDateMode = 'manual';
      return next;
    });
  }
  useEffect(() => {
    if (!draft) return;
    if (
      JSON.stringify(draft.sender) === JSON.stringify(settings.company) &&
      draft.invoiceFooter === settings.invoiceFooter
    )
      return;
    setDraft((current) =>
      current
        ? {
            ...current,
            sender: settings.company,
            invoiceFooter: settings.invoiceFooter,
          }
        : current,
    );
  }, [draft, settings.company, settings.invoiceFooter]);
  useEffect(() => {
    if (
      !draft ||
      draft.dueDateMode !== 'automatic' ||
      !isIsoDate(draft.invoiceDate) ||
      !validPaymentTerm(settings.paymentTermDays)
    )
      return;
    const dueDate = addCalendarDays(
      draft.invoiceDate,
      settings.paymentTermDays,
    );
    if (draft.dueDate !== dueDate)
      setDraft((current) => (current ? { ...current, dueDate } : current));
  }, [
    draft?.invoiceDate,
    draft?.dueDateMode,
    draft?.dueDate,
    settings.paymentTermDays,
  ]);
  function resetDueDate() {
    if (
      !draft ||
      !isIsoDate(draft.invoiceDate) ||
      !validPaymentTerm(settings.paymentTermDays)
    )
      return;
    setDraft({
      ...draft,
      dueDateMode: 'automatic',
      dueDate: addCalendarDays(draft.invoiceDate, settings.paymentTermDays),
    });
  }
  function addLine() {
    const previous = draft?.lines.at(-1);
    const line: InvoiceLineItem = {
      id: crypto.randomUUID(),
      description: previous?.description ?? '',
      hours: previous?.hours ?? '',
      rate: previous?.rate ?? '',
    };
    update({ lines: [...(draft?.lines ?? []), line] });
  }
  function rotateDraft(nextSettings = settings) {
    setDraft(createDraft(nextSettings, customers));
  }
  return {
    draft,
    update,
    addLine,
    resetDueDate,
    loading,
    error,
    setError,
    rotateDraft,
  };
}
