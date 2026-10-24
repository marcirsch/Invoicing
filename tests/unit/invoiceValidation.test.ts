import { describe, expect, it } from 'vitest';
import { invoiceDraftSchema } from '../../src/shared/validation/invoiceValidation';
describe('invoice draft validation', () => {
  it('accepts legacy rows without service dates and validates present dates', () => {
    const legacy = invoiceDraftSchema.parse({
      id: '00000000-0000-4000-8000-000000000000',
      invoiceDate: '2025-02-28',
      dueDate: '2025-03-30',
      currency: 'CHF',
      suggestedNumber: '',
      customerId: null,
      customer: null,
      sender: {
        name: '',
        address: {
          street: '',
          buildingNumber: '',
          postalCode: '',
          city: '',
          country: '',
        },
        phone: '',
        email: '',
      },
      lines: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          description: '',
          hours: '',
          rate: '',
        },
      ],
      template: 'classic',
      notes: '',
    });
    expect(legacy.lines[0]?.serviceDate).toBeUndefined();
    expect(
      invoiceDraftSchema.safeParse({
        ...legacy,
        lines: [{ ...legacy.lines[0], serviceDate: '2025-02-29' }],
      }).success,
    ).toBe(false);
    expect(
      invoiceDraftSchema.safeParse({
        ...legacy,
        lines: [{ ...legacy.lines[0], serviceDate: '2024-02-29' }],
      }).success,
    ).toBe(true);
  });
  it('allows unfinished editor fields while rejecting invalid dates', () => {
    const result = invoiceDraftSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000000',
      invoiceDate: '2025-02-29',
      dueDate: '2025-03-01',
      currency: 'CHF',
      suggestedNumber: '',
      customerId: null,
      customer: null,
      sender: {
        name: '',
        address: {
          street: '',
          buildingNumber: '',
          postalCode: '',
          city: '',
          country: '',
        },
        phone: '',
        email: '',
        website: '',
        iban: '',
        bankName: '',
        logoDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      },
      lines: [],
      template: 'classic',
      notes: '',
    });
    expect(result.success).toBe(false);
  });
  it('defaults new fields when reading a legacy draft and validates sender logo placement', () => {
    const result = invoiceDraftSchema.parse({
      id: '00000000-0000-4000-8000-000000000000',
      invoiceDate: '2025-02-28',
      dueDate: '2025-03-30',
      currency: 'CHF',
      suggestedNumber: '',
      customerId: null,
      customer: null,
      sender: {
        name: '',
        address: {
          street: '',
          buildingNumber: '',
          postalCode: '',
          city: '',
          country: '',
        },
        phone: '',
        email: '',
      },
      lines: [],
      template: 'classic',
      notes: '',
    });
    expect(result.dueDateMode).toBe('automatic');
    expect(result.invoiceFooter).toBe('');
    expect(result.sender.logoDataUrl).toBeNull();
    expect(
      invoiceDraftSchema.safeParse({ ...result, dueDateMode: 'sometimes' })
        .success,
    ).toBe(false);
    expect(
      invoiceDraftSchema.safeParse({
        ...result,
        sender: {
          ...result.sender,
          logoDataUrl: 'data:image/svg+xml;base64,xx',
        },
      }).success,
    ).toBe(false);
  });
});
