import type {
  InvoiceCurrency,
  InvoiceLineItem,
  InvoiceTemplate,
} from './invoice';
import type { Customer } from './customer';
import type { CompanySettings } from './companySettings';

/** Immutable values captured when an invoice is issued. Monetary values are cents. */
export interface IssuedInvoice {
  schemaVersion: 1;
  id: string;
  transactionId: string;
  sourceDraftId: string;
  invoiceNumber: string;
  issuedAt: string;
  invoiceDate: string;
  dueDate: string;
  currency: InvoiceCurrency;
  sender: CompanySettings;
  recipient: Customer;
  lines: InvoiceLineItem[];
  lineTotalsCents: string[];
  totalCents: string;
  template: InvoiceTemplate;
  notes: string;
  invoiceFooter: string;
  pdfPath: string;
  replacesInvoiceId: string | null;
}

export interface InvoiceArchiveEntry {
  id: string;
  invoiceNumber: string;
  customerLabel: string;
  issueDate: string;
  dueDate: string;
  totalCents: string;
  currency: InvoiceCurrency;
  pdfAvailable: boolean;
}
