import type { CompanySettings } from './companySettings';
export interface Settings {
  company: CompanySettings;
  csvPath: string | null;
  archivePath: string | null;
  currency: 'CHF' | 'EUR';
  paymentTermDays: number;
  invoicePrefix: string;
  invoiceYear: string;
  nextSequence: number;
  template: string;
  appearance: 'system' | 'light' | 'dark';
}
