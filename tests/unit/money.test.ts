import { describe, expect, it } from 'vitest';
import {
  calculateInvoiceTotal,
  calculateLineAmount,
  formatCurrency,
} from '../../src/shared/invoice/money';

describe('invoice money', () => {
  it('rounds half cents up per line before summing', () => {
    expect(calculateLineAmount('1', '1.005').cents).toBe('101');
    expect(
      calculateInvoiceTotal([
        { id: 'a', description: '', hours: '1', rate: '0.005' },
        { id: 'b', description: '', hours: '1', rate: '0.005' },
      ]).cents,
    ).toBe('2');
  });
  it('keeps incomplete and invalid text out of calculation', () => {
    expect(calculateLineAmount('', '20').valid).toBe(false);
    expect(calculateLineAmount('-1', '20').valid).toBe(false);
  });
  it('formats only for display', () => {
    expect(
      formatCurrency(calculateLineAmount('1', '10').amount, 'CHF'),
    ).toContain('10.00');
  });
});
