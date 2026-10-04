import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../src/shared/domain/settingsDefaults';
import { settingsSchema } from '../../src/shared/validation/settingsValidation';

const complete = {
  ...defaultSettings,
  company: {
    name: 'Atelier',
    phone: '+41 44 123 45 67',
    email: 'hello@example.ch',
    address: {
      street: 'Bahnhofstrasse',
      buildingNumber: '01',
      postalCode: '8001',
      city: 'Zürich',
      country: 'Switzerland',
    },
  },
};
describe('settings validation', () => {
  it('accepts valid Swiss company and invoice settings', () => {
    expect(settingsSchema.parse(complete)).toEqual(complete);
  });
  it('accepts blank optional email and both supported currencies', () => {
    expect(
      settingsSchema.safeParse({
        ...complete,
        company: { ...complete.company, email: '' },
      }).success,
    ).toBe(true);
    expect(
      settingsSchema.safeParse({ ...complete, currency: 'EUR' }).success,
    ).toBe(true);
  });
  it('rejects missing required identity, invalid email, and invalid numeric values', () => {
    expect(
      settingsSchema.safeParse({
        ...complete,
        company: { ...complete.company, name: '' },
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...complete,
        company: { ...complete.company, email: 'bad' },
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...complete, paymentTermDays: 2.5 }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...complete, nextSequence: -1 }).success,
    ).toBe(false);
  });
  it('rejects unknown appearance and currency values', () => {
    expect(
      settingsSchema.safeParse({ ...complete, appearance: 'neon' }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...complete, currency: 'USD' }).success,
    ).toBe(false);
  });
});
