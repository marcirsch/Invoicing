import { shell } from 'electron';
import { z } from 'zod';
import { issueInvoiceInputSchema } from '../../shared/validation/issuedInvoiceValidation';
import type { InvoiceArchiveStore } from '../services/invoiceArchiveStore';
import type { InvoiceIssuanceService } from '../services/invoiceIssuanceService';
import type { HandlerRegistrar } from './registerHandlers';

export function registerInvoiceHandlers(
  register: HandlerRegistrar,
  archive: InvoiceArchiveStore,
  issuance: InvoiceIssuanceService,
): void {
  register('invoice:issue', async (_event, payload) => {
    const input = issueInvoiceInputSchema.parse(payload);
    return issuance.issue(
      input.draft,
      input.numberOverride,
      input.replacesInvoiceId ?? null,
      input.transactionId,
    );
  });
  register('archive:list', async () => archive.list());
  register('archive:read', async (_event, id) =>
    archive.read(z.string().uuid().parse(id)),
  );
  register('archive:open-pdf', async (_event, id) => {
    const record = await archive.read(z.string().uuid().parse(id));
    const result = await shell.openPath(record.pdfPath);
    if (result)
      throw new Error(
        'The archived PDF could not be opened. Check that the archive folder is available.',
      );
    return true;
  });
  register('archive:reveal-pdf', async (_event, id) => {
    const record = await archive.read(z.string().uuid().parse(id));
    await shell.showItemInFolder(record.pdfPath);
    return true;
  });
}
