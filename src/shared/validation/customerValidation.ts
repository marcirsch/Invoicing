import { z } from 'zod';
export const addressSchema = z.object({
  street: z.string().min(1, 'Enter a street.'),
  buildingNumber: z.string().min(1, 'Enter a building number.'),
  postalCode: z.string().min(1, 'Enter a postal code.'),
  city: z.string().min(1, 'Enter a city.'),
  country: z.string().min(1, 'Enter a country.'),
});
export const customerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Enter a customer name.'),
  email: z.string().email(),
  phone: z.string().min(1, 'Enter a phone number.'),
  address: addressSchema,
});
export type CustomerInput = z.infer<typeof customerSchema>;
