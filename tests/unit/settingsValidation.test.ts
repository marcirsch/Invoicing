import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../src/shared/domain/settingsDefaults';
import {
  settingsBaseSchema,
  settingsSchema,
} from '../../src/shared/validation/settingsValidation';

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
    const result = settingsSchema.parse(complete);
    expect(result.company).toMatchObject({
      website: '',
      iban: '',
      bankName: '',
      logoDataUrl: null,
    });
    expect(result.invoiceFooter).toBe('');
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
  it('allows blank IBAN for settings save while issuance validation requires it', async () => {
    const { validateIssueDraft } =
      await import('../../src/shared/invoice/issueValidation');
    expect(settingsSchema.safeParse(complete).success).toBe(true);
    expect(settingsSchema.parse(complete).company.iban).toBe('');
    // The issue validator independently requires a valid creditor IBAN.
    expect(
      validateIssueDraft({
        id: 'draft',
        invoiceDate: '2026-10-01',
        dueDate: '2026-10-31',
        currency: 'CHF',
        suggestedNumber: 'RE-2026-001',
        customerId: null,
        customer: null,
        sender: { ...defaultSettings.company, ...complete.company, iban: '' },
        lines: [],
        template: 'classic',
        notes: '',
        invoiceFooter: '',
        dueDateMode: 'manual',
      }).issues,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sender.iban' }),
      ]),
    );
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
  it('adds defaults to legacy settings without discarding existing values', () => {
    const legacy = structuredClone(complete) as Record<string, unknown>;
    delete (legacy.company as Record<string, unknown>).website;
    delete (legacy.company as Record<string, unknown>).iban;
    delete (legacy.company as Record<string, unknown>).bankName;
    delete (legacy.company as Record<string, unknown>).logoDataUrl;
    delete legacy.invoiceFooter;
    const parsed = settingsBaseSchema.parse(legacy);
    expect(parsed.csvPath).toBe(complete.csvPath);
    expect(parsed.company.website).toBe('');
    expect(parsed.company.logoDataUrl).toBeNull();
    expect(parsed.invoiceFooter).toBe('');
  });
  it('rejects unsupported and malformed logo data', () => {
    for (const logoDataUrl of [
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/png;base64,not base64',
    ]) {
      expect(
        settingsBaseSchema.safeParse({
          ...complete,
          company: { ...complete.company, logoDataUrl },
        }).success,
      ).toBe(false);
    }
    expect(
      settingsBaseSchema.safeParse({
        ...complete,
        company: {
          ...complete.company,
          logoDataUrl: `data:image/png;base64,${'a'.repeat(2_000_001)}`,
        },
      }).success,
    ).toBe(false);
  });
});
