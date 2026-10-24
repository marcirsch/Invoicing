import type { Address } from './address';
import type { Customer } from './customer';
import type { CompanySettings } from './companySettings';

export type InvoiceCurrency = 'CHF' | 'EUR';
export type InvoiceTemplate = 'classic' | 'simple';
export interface InvoiceLineItem {
  id: string;
  description: string;
  hours: string;
  rate: string;
  /** ISO calendar date; optional only for pre-service-date saved records. */
  serviceDate?: string;
}
export interface InvoiceDraft {
  id: string;
  invoiceDate: string;
  dueDate: string;
  currency: InvoiceCurrency;
  suggestedNumber: string;
  customerId: string | null;
  customer: Customer | null;
  sender: CompanySettings;
  lines: InvoiceLineItem[];
  template: InvoiceTemplate;
  notes: string;
  invoiceFooter: string;
  dueDateMode: 'automatic' | 'manual';
}
export type InvoiceField =
  | 'description'
  | 'hours'
  | 'rate'
  | 'serviceDate'
  | 'invoiceDate'
  | 'dueDate'
  | 'customer';
export type InvoiceAddress = Address;
