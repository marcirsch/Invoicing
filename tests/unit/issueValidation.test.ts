import { describe, expect, it } from 'vitest';
import type { InvoiceDraft } from '../../src/shared/domain/invoice';
import { validateIssueDraft } from '../../src/shared/invoice/issueValidation';

const draft: InvoiceDraft = {
  id: 'd1',
  invoiceDate: '2026-10-07',
  dueDate: '2026-11-06',
  currency: 'CHF',
  suggestedNumber: 'RE-2026-001',
  customerId: 'c1',
  customer: {
    id: 'c1',
    name: 'Kunde',
    email: '',
    phone: '',
    address: {
      street: 'Dorfstrasse',
      buildingNumber: '1',
      postalCode: '8000',
      city: 'Zürich',
      country: 'CH',
    },
  },
  sender: {
    name: 'Firma',
    address: {
      street: 'Hauptstrasse',
      buildingNumber: '2',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH',
    },
    phone: '',
    email: '',
    website: '',
    iban: 'CH93 0076 2011 6238 5295 7',
    bankName: '',
  },
  lines: [{ id: 'l1', description: 'Arbeit', hours: '1', rate: '10.005' }],
  template: 'classic',
  notes: '',
  invoiceFooter: '',
  dueDateMode: 'manual',
};

describe('validateIssueDraft', () => {
  it('accepts complete issue data and preserves shared half-up cents', () => {
    expect(validateIssueDraft(draft)).toMatchObject({
      valid: true,
      totalCents: '1001',
      lineTotalsCents: ['1001'],
    });
  });
  it('returns field specific issues for incomplete identity and payment data', () => {
    const result = validateIssueDraft({
      ...draft,
      sender: { ...draft.sender, iban: '' },
      customer: null,
      lines: [],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.map((item) => item.field)).toEqual(
      expect.arrayContaining(['sender.iban', 'customer', 'lines']),
    );
  });
  it('rejects zero total and unsafe invoice numbers', () => {
    expect(
      validateIssueDraft({
        ...draft,
        lines: [{ ...draft.lines[0]!, rate: '0' }],
      }).issues,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'total' })]),
    );
    expect(validateIssueDraft(draft, '<script>').issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'invoiceNumber' }),
      ]),
    );
  });
  it('rejects QR-bill amounts above the SIX maximum and oversized address fields', () => {
    const oversized = validateIssueDraft({
      ...draft,
      lines: [{ ...draft.lines[0]!, hours: '1000000', rate: '1000000' }],
      customer: {
        ...draft.customer!,
        address: { ...draft.customer!.address, city: 'x'.repeat(36) },
      },
    });
    expect(oversized.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'total' }),
        expect.objectContaining({ field: 'customer.address.city' }),
      ]),
    );
  });
});
