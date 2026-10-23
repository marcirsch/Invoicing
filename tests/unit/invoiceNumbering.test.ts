import { describe, expect, it } from 'vitest';
import { createInvoiceNumberProposal } from '../../src/shared/invoice/numbering';

describe('createInvoiceNumberProposal', () => {
  it('formats the configured prefix, year, and sequence', () => {
    expect(
      createInvoiceNumberProposal({
        invoicePrefix: 'RE-',
        invoiceYear: '2026',
        nextSequence: 1,
      }),
    ).toBe('RE-2026-001');
  });

  it.each([
    [7, '007'],
    [99, '099'],
    [0, '000'],
    [1000, '1000'],
  ])('preserves padStart formatting for sequence %s', (sequence, expected) => {
    expect(
      createInvoiceNumberProposal({
        invoicePrefix: 'RE-',
        invoiceYear: '2026',
        nextSequence: sequence,
      }),
    ).toBe(`RE-2026-${expected}`);
  });

  it('concatenates custom or empty prefix and year without normalization', () => {
    expect(
      createInvoiceNumberProposal({
        invoicePrefix: '',
        invoiceYear: 'FY/26',
        nextSequence: 12,
      }),
    ).toBe('FY/26-012');
  });
});
