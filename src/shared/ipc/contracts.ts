import type { Customer } from '../domain/customer';
import type { Settings } from '../domain/settings';
import type { CsvDelimiter } from '../csv/dialect';
import type { InvoiceDraft } from '../domain/invoice';
import type {
  InvoiceArchiveEntry,
  IssuedInvoice,
} from '../domain/issuedInvoice';
import type { IssueInvoiceInput } from '../validation/issuedInvoiceValidation';
export interface StructuredError {
  code: string;
  message: string;
  issues?: import('../invoice/issueValidation').IssueIssue[];
}
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: StructuredError };
export interface IpcApi {
  loadDraft(): Promise<Result<InvoiceDraft | null>>;
  saveDraft(draft: InvoiceDraft): Promise<Result<InvoiceDraft>>;
  getSettings(): Promise<Result<Settings>>;
  saveSettings(settings: Settings): Promise<Result<Settings>>;
  selectCsv(): Promise<Result<string | null>>;
  selectArchiveFolder(): Promise<Result<string | null>>;
  selectInvoiceLogo(): Promise<Result<string | null>>;
  loadCustomers(delimiter?: CsvDelimiter): Promise<Result<Customer[]>>;
  listCustomers(): Promise<Result<Customer[]>>;
  saveCustomer(customer: Customer): Promise<Result<Customer[]>>;
  deleteCustomer(id: string): Promise<Result<Customer[]>>;
  reloadCustomers(): Promise<Result<Customer[]>>;
  issueInvoice(input: IssueInvoiceInput): Promise<Result<IssuedInvoice>>;
  listInvoices(): Promise<Result<InvoiceArchiveEntry[]>>;
  readInvoice(id: string): Promise<Result<IssuedInvoice>>;
  openInvoicePdf(id: string): Promise<Result<boolean>>;
  revealInvoicePdf(id: string): Promise<Result<boolean>>;
}
