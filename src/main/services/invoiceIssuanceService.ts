import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { InvoiceDraft } from '../../shared/domain/invoice';
import type { IssuedInvoice } from '../../shared/domain/issuedInvoice';
import { calculateLineAmount } from '../../shared/invoice/money';
import { validateIssueDraft } from '../../shared/invoice/issueValidation';
import type { Settings } from '../../shared/domain/settings';
import type { SettingsStore } from './settingsStore';
import type { DraftStore } from './draftStore';
import { InvoiceArchiveStore } from './invoiceArchiveStore';
import { createQrBillPdf } from './qrBillService';
import { appendQrBillPage } from './pdfAssemblyService';

export type InvoicePdfRenderer = (
  invoice: IssuedInvoice,
) => Promise<Uint8Array>;
export class InvoiceIssueError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'InvoiceIssueError';
  }
}
export class InvoiceIssuanceService {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly settings: SettingsStore,
    private readonly drafts: DraftStore,
    private readonly archive: InvoiceArchiveStore,
    private readonly renderInvoice: InvoicePdfRenderer,
  ) {}

  issue(
    draft: InvoiceDraft,
    numberOverride?: string,
    replacesInvoiceId: string | null = null,
    transactionId: string = randomUUID(),
  ): Promise<IssuedInvoice> {
    const operation = this.tail.then(async () => {
      await this.archive.recover();
      const previous = await this.archive.findTransaction(transactionId);
      if (previous) {
        const settings = await this.settings.load();
        await advanceSequence(settings, previous.invoiceNumber, this.settings);
        const currentDraft = await this.drafts.load();
        if (currentDraft?.id === previous.sourceDraftId)
          await this.drafts.clear();
        return previous;
      }
      const currentDraft = await this.drafts.load();
      if (!currentDraft || currentDraft.id !== draft.id)
        throw new InvoiceIssueError(
          'The invoice draft changed. Save it and try again.',
          'draft_changed',
        );
      const settings = await this.settings.load();
      const invoiceNumber = (
        numberOverride?.trim() || draft.suggestedNumber
      ).trim();
      const validation = validateIssueDraft(draft, invoiceNumber);
      if (!validation.valid || !validation.totalCents)
        throw new InvoiceIssueError(
          validation.issues.map((item) => item.message).join(' '),
          'validation',
        );
      if (replacesInvoiceId && !(await this.archive.read(replacesInvoiceId)))
        throw new InvoiceIssueError(
          'Replacement invoice target was not found.',
          'replacement_missing',
        );
      const priorNumber = await this.archive.findNumber(invoiceNumber);
      if (priorNumber && sameDraftSnapshot(priorNumber, draft)) {
        await advanceSequence(
          settings,
          priorNumber.invoiceNumber,
          this.settings,
        );
        const activeDraft = await this.drafts.load();
        if (activeDraft?.id === priorNumber.sourceDraftId)
          await this.drafts.clear();
        return priorNumber;
      }
      if (priorNumber)
        throw new InvoiceIssueError(
          'That invoice number has already been issued. Choose another number.',
          'duplicate_number',
        );
      if (!settings.archivePath)
        throw new InvoiceIssueError(
          'Choose an archive folder in Settings before issuing.',
          'archive_folder_missing',
        );
      const lineTotals = draft.lines.map(
        (line) => calculateLineAmount(line.hours, line.rate).cents!,
      );
      const record: IssuedInvoice = {
        schemaVersion: 1,
        id: randomUUID(),
        transactionId,
        sourceDraftId: draft.id,
        invoiceNumber,
        issuedAt: new Date().toISOString(),
        invoiceDate: draft.invoiceDate,
        dueDate: draft.dueDate,
        currency: draft.currency,
        sender: structuredClone(draft.sender),
        recipient: structuredClone(draft.customer!),
        lines: structuredClone(draft.lines),
        lineTotalsCents: lineTotals,
        totalCents: validation.totalCents,
        template: draft.template,
        notes: draft.notes,
        invoiceFooter: draft.invoiceFooter,
        pdfPath: path.join(
          settings.archivePath,
          `${invoiceNumber.replace(/[^\p{L}\p{N}._-]+/gu, '_')}.pdf`,
        ),
        replacesInvoiceId,
      };
      const invoicePdf = await this.renderInvoice(record);
      const qrPdf = await createQrBillPdf(record);
      const assembled = await appendQrBillPage(invoicePdf, qrPdf);
      await this.archive.commit(record, assembled.bytes);
      await advanceSequence(settings, invoiceNumber, this.settings);
      await this.drafts.clear();
      return record;
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
}
function sameDraftSnapshot(
  record: IssuedInvoice,
  draft: InvoiceDraft,
): boolean {
  return (
    record.sourceDraftId === draft.id &&
    record.invoiceDate === draft.invoiceDate &&
    record.dueDate === draft.dueDate &&
    record.currency === draft.currency &&
    record.template === draft.template &&
    record.notes === draft.notes &&
    record.invoiceFooter === draft.invoiceFooter &&
    JSON.stringify(record.sender) === JSON.stringify(draft.sender) &&
    JSON.stringify(record.recipient) === JSON.stringify(draft.customer) &&
    JSON.stringify(record.lines) === JSON.stringify(draft.lines)
  );
}
async function advanceSequence(
  settings: Settings,
  invoiceNumber: string,
  store: SettingsStore,
): Promise<void> {
  const sequence = parseNumberSequence(invoiceNumber, settings);
  if (sequence !== null && sequence >= settings.nextSequence)
    await store.savePreferences({ ...settings, nextSequence: sequence + 1 });
}
function parseNumberSequence(
  number: string,
  settings: Settings,
): number | null {
  const match = new RegExp(
    `^${escapeRegExp(settings.invoicePrefix)}${escapeRegExp(settings.invoiceYear)}-(\\d+)$`,
  ).exec(number);
  return match ? Number(match[1]) : null;
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
