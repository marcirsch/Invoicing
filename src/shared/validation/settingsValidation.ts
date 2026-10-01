import { z } from 'zod';
import { addressSchema } from './customerValidation';
export const settingsSchema = z.object({
  company: z.object({
    name: z.string(),
    address: addressSchema,
    phone: z.string(),
    email: z.string().email().or(z.literal('')),
  }),
  csvPath: z.string().nullable(),
  archivePath: z.string().nullable(),
  currency: z.enum(['CHF', 'EUR']),
  paymentTermDays: z.number().int().nonnegative(),
  invoicePrefix: z.string(),
  invoiceYear: z.string(),
  nextSequence: z.number().int().nonnegative(),
  template: z.string(),
  appearance: z.enum(['system', 'light', 'dark']),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
