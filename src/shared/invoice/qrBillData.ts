import type { CompanySettings } from '../domain/companySettings';
import type { Customer } from '../domain/customer';
import type { InvoiceCurrency } from '../domain/invoice';
import type { Data, Debtor } from 'swissqrbill/types';
import { isIBANValid } from 'swissqrbill/utils';

export interface QrBillSource {
  sender: CompanySettings;
  recipient: Customer | null;
  totalCents: string;
  currency: InvoiceCurrency;
  invoiceNumber: string;
}
const countryCodes: Record<string, string> = {
  switzerland: 'CH',
  schweiz: 'CH',
  suisse: 'CH',
  svizzera: 'CH',
  liechtenstein: 'LI',
  germany: 'DE',
  deutschland: 'DE',
  austria: 'AT',
  österreich: 'AT',
  france: 'FR',
  italy: 'IT',
  italia: 'IT',
};
function countryCode(value: string): string | undefined {
  return value.length === 2
    ? value.toUpperCase()
    : countryCodes[value.toLocaleLowerCase('de-CH')];
}
function address(value: CompanySettings['address'], name: string): Debtor {
  const country = countryCode(value.country);
  if (!country)
    throw new Error(
      'Use a two-letter country code or a supported country name in the invoice addresses.',
    );
  return {
    name,
    address: value.street,
    buildingNumber: value.buildingNumber || undefined,
    zip: /^\d+$/.test(value.postalCode)
      ? Number(value.postalCode)
      : value.postalCode,
    city: value.city,
    country,
  };
}

export function validateQrBillSource(invoice: QrBillSource): string[] {
  const issues: string[] = [];
  const validAddress = (a: CompanySettings['address'] | undefined) =>
    Boolean(
      a?.street.trim() &&
      a.city.trim() &&
      a.postalCode.trim() &&
      countryCode(a.country),
    );
  if (!invoice.sender.name.trim() || !validAddress(invoice.sender.address))
    issues.push('Complete the sender name and address in Settings.');
  if (
    !invoice.recipient ||
    !invoice.recipient.name.trim() ||
    !validAddress(invoice.recipient.address)
  )
    issues.push('Choose a customer with a complete address.');
  const iban = invoice.sender.iban.replace(/[\s-]/g, '').toUpperCase();
  if (!/^(CH|LI)\d{19}$/.test(iban) || !isIBANValid(iban))
    issues.push('Enter a valid Swiss or Liechtenstein IBAN in Settings.');
  try {
    if (BigInt(invoice.totalCents) <= 0n)
      issues.push('Add a positive invoice total.');
  } catch {
    issues.push('Add a valid invoice total.');
  }
  if (!invoice.invoiceNumber.trim()) issues.push('Enter an invoice number.');
  return issues;
}

export function mapQrBillData(invoice: QrBillSource): Data {
  if (!invoice.recipient) throw new Error('A recipient is required.');
  return {
    creditor: {
      ...address(invoice.sender.address, invoice.sender.name),
      account: invoice.sender.iban.replace(/[\s-]/g, ''),
    },
    debtor: address(invoice.recipient.address, invoice.recipient.name),
    amount: Number(BigInt(invoice.totalCents)) / 100,
    currency: invoice.currency,
    message: `Invoice ${invoice.invoiceNumber}`.slice(0, 140),
  };
}
