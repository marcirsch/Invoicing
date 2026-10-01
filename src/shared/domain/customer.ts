import type { Address } from './address';
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
}
