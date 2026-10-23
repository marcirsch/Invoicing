import type { Settings } from '../domain/settings';

/** Builds the current invoice number proposal from the relevant settings. */
export function createInvoiceNumberProposal(
  settings: Pick<Settings, 'invoicePrefix' | 'invoiceYear' | 'nextSequence'>,
): string {
  return `${settings.invoicePrefix}${settings.invoiceYear}-${String(settings.nextSequence).padStart(3, '0')}`;
}
