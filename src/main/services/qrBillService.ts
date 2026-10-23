import { once } from 'node:events';
import PDFDocument from 'pdfkit';
import { SwissQRBill } from 'swissqrbill/pdf';
import type { IssuedInvoice } from '../../shared/domain/issuedInvoice';
import { mapQrBillData } from '../../shared/invoice/qrBillData';

/** Produces the final payment page through SwissQRBill's standards-owned renderer. */
export async function createQrBillPdf(
  invoice: IssuedInvoice,
): Promise<Uint8Array> {
  const doc = new PDFDocument({ autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const qrBill = new SwissQRBill(mapQrBillData(invoice), { language: 'DE' });
  doc.addPage({ size: 'A4', margin: 0 });
  const pageHeight = doc.page.height;
  qrBill.attachTo(doc, 0, pageHeight - SwissQRBill.height);
  doc.end();
  await once(doc, 'end');
  return Buffer.concat(chunks);
}
