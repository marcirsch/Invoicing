import { z } from 'zod';
import { isIsoDate } from '../invoice/dates';

const addressSchema = z.object({
  street: z.string(),
  buildingNumber: z.string(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string(),
});
const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  address: addressSchema,
});
const companySchema = z.object({
  name: z.string(),
  address: addressSchema,
  phone: z.string(),
  email: z.string(),
});
export const invoiceDraftSchema = z.object({
  id: z.string().uuid(),
  invoiceDate: z.string().refine(isIsoDate, 'Enter a valid invoice date.'),
  dueDate: z.string().refine(isIsoDate, 'Enter a valid due date.'),
  currency: z.enum(['CHF', 'EUR']),
  suggestedNumber: z.string().max(80),
  customerId: z.string().nullable(),
  customer: customerSchema.nullable(),
  sender: companySchema,
  lines: z
    .array(
      z.object({
        id: z.string().uuid(),
        description: z.string().max(4000),
        hours: z.string().max(24),
        rate: z.string().max(24),
      }),
    )
    .max(500),
  template: z.enum(['classic', 'simple']).default('classic'),
  notes: z.string().max(4000),
});
export const persistedDraftSchema = z.object({
  version: z.literal(1),
  draft: invoiceDraftSchema,
});
