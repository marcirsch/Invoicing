import { describe, expect, it } from 'vitest';
import { customerSchema } from '../../src/shared/validation/customerValidation';
describe('customer validation', () => {
  it('requires name', () =>
    expect(
      customerSchema.safeParse({
        id: '1',
        name: '',
        email: 'a@b.ch',
        phone: '1',
        address: {
          street: '',
          buildingNumber: '',
          postalCode: '',
          city: '',
          country: '',
        },
      }).success,
    ).toBe(false));
});
