import type { Customer } from '../domain/customer';
import type { Settings } from '../domain/settings';
export interface StructuredError {
  code: string;
  message: string;
}
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: StructuredError };
export interface IpcApi {
  getSettings(): Promise<Result<Settings>>;
  saveSettings(settings: Settings): Promise<Result<Settings>>;
  selectCsv(): Promise<Result<string | null>>;
  listCustomers(): Promise<Result<Customer[]>>;
  saveCustomer(customer: Customer): Promise<Result<Customer>>;
  deleteCustomer(id: string): Promise<Result<void>>;
  reloadCustomers(): Promise<Result<Customer[]>>;
}
