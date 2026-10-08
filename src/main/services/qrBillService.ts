import { once } from 'node:events';
import PDFDocument from 'pdfkit';
import { SwissQRBill } from 'swissqrbill/pdf';
import type { IssuedInvoice } from '../../shared/domain/issuedInvoice';

function address(address: IssuedInvoice['sender']['address'], name: string) {
  const zip = address.postalCode;
  const countryCodes: Record<string, string> = {
    switzerland: 'CH',
    schweiz: 'CH',
    suisse: 'CH',
    svizzera: 'CH',
    liechtenstein: 'LI',
    germany: 'DE',
    deutschland: 'DE',
    austria: 'AT',
    österreich: 'AT',
    france: 'FR',
    italy: 'IT',
    italia: 'IT',
  };
  const country =
    address.country.length === 2
      ? address.country.toUpperCase()
      : countryCodes[address.country.toLocaleLowerCase('de-CH')];
  if (!country)
    throw new Error(
      'Use a two-letter country code or a supported country name in the invoice addresses.',
    );
  return {
    name,
    address: address.street,
    buildingNumber: address.buildingNumber || undefined,
    zip: /^\d+$/.test(zip) ? Number(zip) : zip,
    city: address.city,
    country,
  };
}

/** Produces the final payment page through SwissQRBill's standards-owned renderer. */
export async function createQrBillPdf(
  invoice: IssuedInvoice,
): Promise<Uint8Array> {
  const doc = new PDFDocument({ autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const qrBill = new SwissQRBill(
    {
      creditor: {
        ...address(invoice.sender.address, invoice.sender.name),
        account: invoice.sender.iban.replace(/[\s-]/g, ''),
      },
      debtor: address(invoice.recipient.address, invoice.recipient.name),
      amount: Number(BigInt(invoice.totalCents)) / 100,
      currency: invoice.currency,
      message: `Invoice ${invoice.invoiceNumber}`.slice(0, 140),
    },
    { language: 'DE' },
  );
  doc.addPage({ size: 'A4', margin: 0 });
  const pageHeight = doc.page.height;
  qrBill.attachTo(doc, 0, pageHeight - SwissQRBill.height);
  doc.end();
  await once(doc, 'end');
  return Buffer.concat(chunks);
}
