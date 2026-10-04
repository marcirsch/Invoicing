import { describe, expect, it } from 'vitest';
import { customerSchema } from '../../src/shared/validation/customerValidation';

const customer = {
  id: '0007',
  name: 'Élodie 李',
  email: 'elodie@example.ch',
  phone: '+41 79 123 45 67',
  address: {
    street: 'Rue du Lac',
    buildingNumber: '02',
    postalCode: '0123',
    city: 'Genève',
    country: 'Suisse',
  },
};
describe('customer validation', () => {
  it('preserves text identifiers, Unicode, phone prefixes, and leading zeroes', () => {
    expect(customerSchema.parse(customer)).toEqual(customer);
  });
  it('rejects each missing required value and invalid email', () => {
    for (const invalid of [
      { ...customer, name: '' },
      { ...customer, phone: '' },
      { ...customer, email: 'not-an-email' },
      { ...customer, address: { ...customer.address, postalCode: '' } },
    ])
      expect(customerSchema.safeParse(invalid).success).toBe(false);
  });
  it('does not trim user-entered text implicitly', () => {
    expect(
      customerSchema.parse({ ...customer, name: '  A. Example  ' }).name,
    ).toBe('  A. Example  ');
  });
});
