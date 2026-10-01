import { z } from 'zod';
export const addressSchema = z.object({
  street: z.string(),
  buildingNumber: z.string(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string(),
});
export const customerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: addressSchema,
});
export type CustomerInput = z.infer<typeof customerSchema>;
