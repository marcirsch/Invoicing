import { describe, expect, it } from 'vitest';
import { addCalendarDays, isIsoDate } from '../../src/shared/invoice/dates';
describe('date-only invoice dates', () => {
  it('validates leap dates and rejects impossible dates', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2025-02-29')).toBe(false);
  });
  it('adds calendar days across month and year boundaries', () => {
    expect(addCalendarDays('2024-12-31', 1)).toBe('2025-01-01');
  });
});
