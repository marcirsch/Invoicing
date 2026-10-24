import { describe, expect, it } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import { createQrBillPdf } from '../../src/main/services/qrBillService';
import { appendQrBillPage } from '../../src/main/services/pdfAssemblyService';
import type { IssuedInvoice } from '../../src/shared/domain/issuedInvoice';

const invoice: IssuedInvoice = {
  schemaVersion: 1,
  id: 'a0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
  transactionId: 'b0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
  sourceDraftId: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
  invoiceNumber: 'RE-2026-001',
  issuedAt: '2026-10-07T10:00:00.000Z',
  invoiceDate: '2026-10-07',
  dueDate: '2026-11-06',
  currency: 'CHF',
  sender: {
    name: 'Example GmbH',
    address: {
      street: 'Musterstrasse',
      buildingNumber: '1',
      postalCode: '8000',
      city: 'Zürich',
      country: 'Switzerland',
    },
    phone: '',
    email: '',
    website: '',
    iban: 'CH9300762011623852957',
    bankName: '',
    logoDataUrl: null,
  },
  recipient: {
    id: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
    name: 'Kunde AG',
    email: '',
    phone: '',
    address: {
      street: 'Bahnhofstrasse',
      buildingNumber: '2',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    },
  },
  lines: [
    {
      id: 'd0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
      description: 'Consulting',
      hours: '1',
      rate: '10',
    },
  ],
  lineTotalsCents: ['1000'],
  totalCents: '1000',
  template: 'classic',
  notes: '',
  invoiceFooter: '',
  pdfPath: '/tmp/invoice.pdf',
  replacesInvoiceId: null,
};

describe('QR-bill PDF adapter', () => {
  it('generates one QR page and appends it after every invoice page', async () => {
    const qrBytes = await createQrBillPdf(invoice);
    const qr = await PDFDocument.load(qrBytes);
    expect(qr.getPageCount()).toBe(1);
    const billSize = qr.getPage(0)!.getSize();
    expect(billSize.width).toBeGreaterThan(500);
    expect(billSize.height).toBeGreaterThan(800);
    expect(billSize.width).toBeLessThan(billSize.height);
    const invoicePdf = await PDFDocument.create();
    const invoicePageSize = [595.28, 841.89] as const;
    invoicePdf.addPage([...invoicePageSize]);
    invoicePdf.addPage([...invoicePageSize]);
    const assembled = await appendQrBillPage(await invoicePdf.save(), qrBytes);
    expect(assembled).toMatchObject({ invoicePageCount: 2, totalPageCount: 3 });
    const output = await PDFDocument.load(assembled.bytes);
    expect(output.getPageCount()).toBe(3);
    expect(output.getPage(0)!.getSize()).toEqual({
      width: invoicePageSize[0],
      height: invoicePageSize[1],
    });
    expect(output.getPage(0)!.getSize().width).toBeLessThan(
      output.getPage(0)!.getSize().height,
    );
    expect(output.getPage(1)!.getSize()).toEqual({
      width: invoicePageSize[0],
      height: invoicePageSize[1],
    });
    expect(output.getPage(1)!.getSize().width).toBeLessThan(
      output.getPage(1)!.getSize().height,
    );
    expect(output.getPage(2)!.getSize()).toEqual(billSize);
  });
});
