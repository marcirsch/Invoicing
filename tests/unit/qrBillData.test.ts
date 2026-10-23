import { describe, expect, it } from 'vitest';
import {
  mapQrBillData,
  validateQrBillSource,
} from '../../src/shared/invoice/qrBillData';
import type { IssuedInvoice } from '../../src/shared/domain/issuedInvoice';

const invoice: IssuedInvoice = {
  schemaVersion: 1,
  id: 'id',
  transactionId: 'tx',
  sourceDraftId: 'draft',
  invoiceNumber: 'QA-2026-041',
  issuedAt: '',
  invoiceDate: '',
  dueDate: '',
  currency: 'EUR',
  sender: {
    name: 'Sender',
    address: {
      street: 'Main',
      buildingNumber: '4',
      postalCode: '8000',
      city: 'Zürich',
      country: 'Switzerland',
    },
    phone: '',
    email: '',
    website: '',
    iban: 'CH93 0076-2011 6238 5295 7',
    bankName: '',
    logoDataUrl: null,
  },
  recipient: {
    id: 'c',
    name: 'Recipient',
    email: '',
    phone: '',
    address: {
      street: 'Other',
      buildingNumber: '2',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    },
  },
  lines: [],
  lineTotalsCents: [],
  totalCents: '30126',
  template: 'classic',
  notes: '',
  invoiceFooter: '',
  pdfPath: '',
  replacesInvoiceId: null,
};

describe('shared QR-bill data mapping', () => {
  it('normalizes creditor IBAN and maps cents, currency, address, and invoice message', () => {
    expect(mapQrBillData(invoice)).toMatchObject({
      creditor: { account: 'CH9300762011623852957', country: 'CH' },
      debtor: { country: 'CH' },
      amount: 301.26,
      currency: 'EUR',
      message: 'Invoice QA-2026-041',
    });
  });
  it('reports incomplete required values before rendering', () => {
    expect(
      validateQrBillSource({
        ...invoice,
        recipient: null,
        totalCents: '0',
        invoiceNumber: '',
      }),
    ).toEqual(
      expect.arrayContaining([
        'Choose a customer with a complete address.',
        'Add a positive invoice total.',
        'Enter an invoice number.',
      ]),
    );
  });
});
