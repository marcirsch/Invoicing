import type { Settings } from './settings';
export const defaultSettings: Settings = {
  company: {
    name: '',
    address: {
      street: '',
      buildingNumber: '',
      postalCode: '',
      city: '',
      country: 'Switzerland',
    },
    phone: '',
    email: '',
  },
  csvPath: null,
  archivePath: null,
  currency: 'CHF',
  paymentTermDays: 30,
  invoicePrefix: 'RE-',
  invoiceYear: String(new Date().getFullYear()),
  nextSequence: 1,
  template: 'default',
  appearance: 'system',
};
