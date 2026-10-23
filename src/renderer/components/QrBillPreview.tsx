import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SwissQRBill } from 'swissqrbill/svg';
import type { InvoiceDraft } from '../../shared/domain/invoice';
import { calculateInvoiceTotal } from '../../shared/invoice/money';
import {
  mapQrBillData,
  validateQrBillSource,
} from '../../shared/invoice/qrBillData';

export function QrBillPreview({
  draft,
  invoiceNumber,
}: {
  draft: InvoiceDraft;
  invoiceNumber: string;
}): JSX.Element {
  const holder = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const total = calculateInvoiceTotal(draft.lines);
  const cents = total.valid ? (total.cents ?? '0') : 'invalid';
  const source = useMemo(
    () => ({
      sender: draft.sender,
      recipient: draft.customer,
      totalCents: cents,
      currency: draft.currency,
      invoiceNumber,
    }),
    [draft.sender, draft.customer, cents, draft.currency, invoiceNumber],
  );
  const issues = validateQrBillSource(source);
  useLayoutEffect(() => {
    const root = holder.current;
    if (!root || issues.length) return;
    try {
      const bill = new SwissQRBill(mapQrBillData(source), { language: 'DE' });
      bill.element.setAttribute('width', '210mm');
      bill.element.setAttribute('height', '105mm');
      root.replaceChildren(bill.element);
      setRenderError(false);
    } catch {
      setRenderError(true);
    }
  }, [source, issues.length]);
  return (
    <section
      className="invoice-paper qr-bill-preview"
      aria-label="QR-bill preview"
    >
      <div className="qr-bill-preview-content">
        {issues.length || renderError ? (
          <div className="qr-bill-incomplete" role="status">
            <h2>QR-bill not ready</h2>
            <p>Complete these details to preview the payment slip:</p>
            <ul>
              {(renderError
                ? ['Check the sender and recipient address and IBAN details.']
                : issues
              ).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div ref={holder} className="qr-bill-svg" />
        )}
      </div>
    </section>
  );
}
