import { PDFDocument } from '@cantoo/pdf-lib';

export interface AssembledPdf {
  bytes: Uint8Array;
  invoicePageCount: number;
  totalPageCount: number;
}
export async function appendQrBillPage(
  invoicePdf: Uint8Array,
  qrPdf: Uint8Array,
): Promise<AssembledPdf> {
  const invoice = await PDFDocument.load(invoicePdf);
  const qr = await PDFDocument.load(qrPdf);
  if (qr.getPageCount() !== 1)
    throw new Error('QR-bill PDF must contain exactly one page.');
  const output = await PDFDocument.create();
  const invoicePages = await output.copyPages(
    invoice,
    invoice.getPageIndices(),
  );
  const qrPage = (await output.copyPages(qr, [0]))[0];
  for (const page of invoicePages) output.addPage(page);
  output.addPage(qrPage);
  if (output.getPageCount() !== invoice.getPageCount() + 1)
    throw new Error('PDF page assembly failed.');
  return {
    bytes: await output.save(),
    invoicePageCount: invoice.getPageCount(),
    totalPageCount: output.getPageCount(),
  };
}
