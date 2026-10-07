import type { Address } from './address';
export interface CompanySettings {
  name: string;
  address: Address;
  phone: string;
  email: string;
  website: string;
  iban: string;
  bankName: string;
  logoDataUrl?: string | null;
}
