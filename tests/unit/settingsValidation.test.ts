import { describe, expect, it } from 'vitest';
import { settingsSchema } from '../../src/shared/validation/settingsValidation';
describe('settings validation', () => {
  it('accepts currency', () =>
    expect(settingsSchema.shape.currency.safeParse('CHF').success).toBe(true));
});
