import { z } from 'zod';
import { invoiceDraftSchema } from './invoiceValidation';
import type { InvoiceDraft } from '../domain/invoice';

export const issuedInvoiceSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  sourceDraftId: z.string().uuid(),
  invoiceNumber: z.string().min(1).max(80),
  issuedAt: z.string().datetime(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  currency: z.enum(['CHF', 'EUR']),
  sender: invoiceDraftSchema.shape.sender,
  recipient: invoiceDraftSchema.shape.customer.unwrap(),
  lines: invoiceDraftSchema.shape.lines,
  lineTotalsCents: z.array(z.string().regex(/^\d+$/)),
  totalCents: z.string().regex(/^\d+$/),
  template: z.enum(['classic', 'simple']),
  notes: z.string().max(4000),
  invoiceFooter: z.string().max(2000),
  pdfPath: z.string().min(1),
  replacesInvoiceId: z.string().uuid().nullable(),
});
export const persistedInvoiceArchiveSchema = z.object({
  version: z.literal(1),
  invoices: z.array(issuedInvoiceSchema),
});
export const issueInvoiceInputSchema = z.object({
  draft: invoiceDraftSchema,
  numberOverride: z.string().max(80).optional(),
  replacesInvoiceId: z.string().uuid().nullable().optional(),
  transactionId: z.string().uuid(),
});
export interface IssueInvoiceInput {
  draft: InvoiceDraft;
  numberOverride?: string;
  replacesInvoiceId?: string | null;
  transactionId: string;
}
