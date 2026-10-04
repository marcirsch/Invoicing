import Decimal from 'decimal.js';
import type { InvoiceCurrency, InvoiceLineItem } from '../domain/invoice';

const MoneyDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});
export interface LineAmount {
  valid: boolean;
  amount: Decimal | null;
  cents: string | null;
}
const MAX_INPUT = 24;
const DECIMAL_TEXT = /^\d+(?:\.\d+)?$/;

/** Calculates and rounds one invoice row to cents, half up. */
export function calculateLineAmount(hours: string, rate: string): LineAmount {
  if (!hours.trim() || !rate.trim())
    return { valid: false, amount: null, cents: null };
  if (
    hours.length > MAX_INPUT ||
    rate.length > MAX_INPUT ||
    !DECIMAL_TEXT.test(hours) ||
    !DECIMAL_TEXT.test(rate)
  )
    return { valid: false, amount: null, cents: null };
  try {
    const quantity = new MoneyDecimal(hours);
    const unitRate = new MoneyDecimal(rate);
    if (quantity.gt(1000000) || unitRate.gt(1000000))
      return { valid: false, amount: null, cents: null };
    const amount = quantity
      .times(unitRate)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return { valid: true, amount, cents: amount.times(100).toFixed(0) };
  } catch {
    return { valid: false, amount: null, cents: null };
  }
}

export function calculateInvoiceTotal(
  lines: readonly InvoiceLineItem[],
): LineAmount {
  let cents = new MoneyDecimal(0);
  for (const line of lines) {
    const result = calculateLineAmount(line.hours, line.rate);
    if (!result.valid || result.cents === null)
      return { valid: false, amount: null, cents: null };
    cents = cents.plus(result.cents);
  }
  const amount = cents.div(100);
  return { valid: true, amount, cents: cents.toFixed(0) };
}

export function formatCurrency(
  amount: Decimal | null,
  currency: InvoiceCurrency,
): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency }).format(
    amount?.toNumber() ?? 0,
  );
}
