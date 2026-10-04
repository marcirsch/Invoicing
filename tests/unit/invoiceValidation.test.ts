import { describe, expect, it } from 'vitest';
import { invoiceDraftSchema } from '../../src/shared/validation/invoiceValidation';
describe('invoice draft validation', () => {
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
      },
      lines: [],
      template: 'classic',
      notes: '',
    });
    expect(result.success).toBe(false);
  });
});
