import type { InvoiceDraft } from '../domain/invoice';
import { calculateLineAmount, calculateInvoiceTotal } from './money';
import { isIsoDate } from './dates';

export interface IssueIssue {
  field: string;
  message: string;
}
export interface IssueValidation {
  valid: boolean;
  issues: IssueIssue[];
  totalCents: string | null;
  lineTotalsCents: string[];
}

function validIban(value: string): boolean {
  const iban = value.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits)
      remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function hasQrCountry(value: string): boolean {
  return /^(?:[A-Z]{2}|Switzerland|Schweiz|Suisse|Svizzera|Liechtenstein|Deutschland|Germany|Österreich|Austria|France|Italia|Italy)$/iu.test(
    value.trim(),
  );
}

export function validateIssueDraft(
  draft: InvoiceDraft,
  invoiceNumber = draft.suggestedNumber,
): IssueValidation {
  const issues: IssueIssue[] = [];
  const required = (field: string, value: string, label: string) => {
    if (!value.trim()) issues.push({ field, message: `${label} is required.` });
  };
  required('sender.name', draft.sender.name, 'Your company name');
  if (draft.sender.name.length > 70)
    issues.push({
      field: 'sender.name',
      message: 'Company name must be 70 characters or fewer for the QR-bill.',
    });
  for (const field of ['street', 'postalCode', 'city', 'country'] as const)
    required(
      `sender.address.${field}`,
      draft.sender.address[field],
      'Creditor address field',
    );
  if (draft.sender.address.street.length > 70)
    issues.push({
      field: 'sender.address.street',
      message: 'Street must be 70 characters or fewer for the QR-bill.',
    });
  if (draft.sender.address.buildingNumber.length > 16)
    issues.push({
      field: 'sender.address.buildingNumber',
      message:
        'Building number must be 16 characters or fewer for the QR-bill.',
    });
  if (draft.sender.address.postalCode.length > 16)
    issues.push({
      field: 'sender.address.postalCode',
      message: 'Postal code must be 16 characters or fewer for the QR-bill.',
    });
  if (draft.sender.address.city.length > 35)
    issues.push({
      field: 'sender.address.city',
      message: 'City must be 35 characters or fewer for the QR-bill.',
    });
  if (!validIban(draft.sender.iban))
    issues.push({
      field: 'sender.iban',
      message: 'Enter a valid IBAN for the QR-bill.',
    });
  else {
    const iban = draft.sender.iban.replace(/[\s-]/g, '').toUpperCase();
    const iid = Number(iban.slice(4, 9));
    if (!['CH', 'LI'].includes(iban.slice(0, 2)))
      issues.push({
        field: 'sender.iban',
        message: 'Swiss QR-bills require a Swiss or Liechtenstein IBAN.',
      });
    if (iid >= 30000 && iid <= 31999)
      issues.push({
        field: 'sender.iban',
        message:
          'QR-IBAN requires a QR reference; use a standard IBAN for invoice-number payment messages.',
      });
  }
  if (!draft.customer)
    issues.push({
      field: 'customer',
      message: 'Choose a customer before issuing.',
    });
  else {
    required('customer.name', draft.customer.name, 'Customer name');
    if (draft.customer.name.length > 70)
      issues.push({
        field: 'customer.name',
        message:
          'Customer name must be 70 characters or fewer for the QR-bill.',
      });
    for (const field of ['street', 'postalCode', 'city', 'country'] as const)
      required(
        `customer.address.${field}`,
        draft.customer.address[field],
        'Debtor address field',
      );
    if (draft.customer.address.street.length > 70)
      issues.push({
        field: 'customer.address.street',
        message: 'Street must be 70 characters or fewer for the QR-bill.',
      });
    if (draft.customer.address.buildingNumber.length > 16)
      issues.push({
        field: 'customer.address.buildingNumber',
        message:
          'Building number must be 16 characters or fewer for the QR-bill.',
      });
    if (draft.customer.address.postalCode.length > 16)
      issues.push({
        field: 'customer.address.postalCode',
        message: 'Postal code must be 16 characters or fewer for the QR-bill.',
      });
    if (draft.customer.address.city.length > 35)
      issues.push({
        field: 'customer.address.city',
        message: 'City must be 35 characters or fewer for the QR-bill.',
      });
    if (!hasQrCountry(draft.customer.address.country))
      issues.push({
        field: 'customer.address.country',
        message: 'Enter a two-letter country code or a supported country name.',
      });
  }
  if (!hasQrCountry(draft.sender.address.country))
    issues.push({
      field: 'sender.address.country',
      message: 'Enter a two-letter country code or a supported country name.',
    });
  if (!isIsoDate(draft.invoiceDate))
    issues.push({
      field: 'invoiceDate',
      message: 'Enter a valid invoice date.',
    });
  if (!isIsoDate(draft.dueDate))
    issues.push({ field: 'dueDate', message: 'Enter a valid due date.' });
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._/-]{0,79}$/u.test(invoiceNumber.trim()))
    issues.push({
      field: 'invoiceNumber',
      message:
        'Use a valid invoice number (up to 80 letters, numbers, spaces, dots, underscores, slashes or hyphens).',
    });
  if (draft.lines.length === 0)
    issues.push({ field: 'lines', message: 'Add at least one service row.' });
  const lineTotalsCents: string[] = [];
  draft.lines.forEach((line, index) => {
    if (!line.description.trim())
      issues.push({
        field: `lines.${index}.description`,
        message: 'Enter a service description.',
      });
    if (line.serviceDate !== undefined && !isIsoDate(line.serviceDate))
      issues.push({
        field: `lines.${index}.serviceDate`,
        message: 'Enter a valid service date.',
      });
    const amount = calculateLineAmount(line.hours, line.rate);
    if (!amount.valid || !amount.cents)
      issues.push({
        field: `lines.${index}`,
        message: 'Enter valid non-negative hours and rate.',
      });
    else lineTotalsCents.push(amount.cents);
  });
  const total = calculateInvoiceTotal(draft.lines);
  if (!total.valid || total.cents === null)
    issues.push({
      field: 'lines',
      message: 'Complete every service amount before issuing.',
    });
  else if (BigInt(total.cents) <= 0n)
    issues.push({
      field: 'total',
      message: 'Invoice total must be greater than zero.',
    });
  else if (BigInt(total.cents) > 99_999_999_999n)
    issues.push({
      field: 'total',
      message:
        'Invoice total cannot exceed CHF/EUR 999,999,999.99 for a QR-bill.',
    });
  return {
    valid: issues.length === 0,
    issues,
    totalCents: issues.length === 0 ? total.cents : null,
    lineTotalsCents: issues.length === 0 ? lineTotalsCents : [],
  };
}
