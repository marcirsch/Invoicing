import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import type {
  InvoiceArchiveEntry,
  IssuedInvoice,
} from '../../shared/domain/issuedInvoice';
import {
  issuedInvoiceSchema,
  persistedInvoiceArchiveSchema,
} from '../../shared/validation/issuedInvoiceValidation';

const issueJournalSchema = z.object({
  version: z.literal(1),
  state: z.enum(['prepared', 'pdf-written', 'record-committed']),
  record: issuedInvoiceSchema,
  pdfSha256: z
    .string()
    .regex(/^[a-f\d]{64}$/i)
    .optional(),
});

export class InvoiceArchiveStore {
  private tail: Promise<unknown> = Promise.resolve();
  private get indexPath(): string {
    return path.join(this.userDataPath, 'issued-invoices.json');
  }
  private get journalPath(): string {
    return path.join(this.userDataPath, 'invoice-issue-journal.json');
  }
  constructor(private readonly userDataPath: string) {}

  async list(): Promise<InvoiceArchiveEntry[]> {
    await this.recover();
    const records = await this.readRecords();
    return Promise.all(
      records.map(async (record) => ({
        id: record.id,
        invoiceNumber: record.invoiceNumber,
        customerLabel: record.recipient.name,
        issueDate: record.invoiceDate,
        dueDate: record.dueDate,
        totalCents: record.totalCents,
        currency: record.currency,
        pdfAvailable: await fs
          .access(record.pdfPath)
          .then(() => true)
          .catch(() => false),
      })),
    );
  }
  async read(id: string): Promise<IssuedInvoice> {
    await this.recover();
    const record = (await this.readRecords()).find((item) => item.id === id);
    if (!record) throw new Error('Issued invoice was not found.');
    return record;
  }
  async hasNumber(number: string): Promise<boolean> {
    return (await this.readRecords()).some(
      (record) => record.invoiceNumber === number,
    );
  }
  async findNumber(number: string): Promise<IssuedInvoice | null> {
    return (
      (await this.readRecords()).find(
        (record) => record.invoiceNumber === number,
      ) ?? null
    );
  }
  async findTransaction(transactionId: string): Promise<IssuedInvoice | null> {
    return (
      (await this.readRecords()).find(
        (record) => record.transactionId === transactionId,
      ) ?? null
    );
  }
  async commit(record: IssuedInvoice, pdfBytes: Uint8Array): Promise<void> {
    const operation = this.tail.then(async () => {
      await fs.mkdir(this.userDataPath, { recursive: true });
      const pdfDirectory = path.dirname(record.pdfPath);
      await fs.mkdir(pdfDirectory, { recursive: true });
      if (
        await fs
          .access(record.pdfPath)
          .then(() => true)
          .catch(() => false)
      )
        throw new Error(
          'An archived PDF with that filename already exists. Choose another invoice number.',
        );
      const pdfSha256 = createHash('sha256').update(pdfBytes).digest('hex');
      await fs
        .writeFile(
          this.journalPath,
          JSON.stringify({ version: 1, state: 'prepared', record, pdfSha256 }),
          { flag: 'wx' },
        )
        .catch(async (error: NodeJS.ErrnoException) => {
          if (error.code === 'EEXIST')
            throw new Error(
              'An invoice issue needs recovery before another invoice can be issued.',
            );
          throw error;
        });
      const temporaryPdf = path.join(pdfDirectory, `.${record.id}.tmp`);
      try {
        await fs.writeFile(temporaryPdf, pdfBytes, { flag: 'wx' });
        const handle = await fs.open(temporaryPdf, 'r');
        await handle.sync();
        await handle.close();
        await fs.writeFile(
          this.journalPath,
          JSON.stringify({
            version: 1,
            state: 'pdf-written',
            record,
            pdfSha256,
          }),
        );
        await fs.copyFile(temporaryPdf, record.pdfPath, 1);
        await fs.rm(temporaryPdf, { force: true });
        const records = await this.readRecords();
        if (
          records.some(
            (item) =>
              item.invoiceNumber === record.invoiceNumber ||
              item.id === record.id,
          )
        )
          throw new Error('Invoice number or archive record already exists.');
        const payload = persistedInvoiceArchiveSchema.parse({
          version: 1,
          invoices: [...records, record],
        });
        const tempIndex = `${this.indexPath}.tmp`;
        await fs.writeFile(tempIndex, JSON.stringify(payload, null, 2), {
          flag: 'wx',
        });
        await fs.rename(tempIndex, this.indexPath);
        await fs.writeFile(
          this.journalPath,
          JSON.stringify({
            version: 1,
            state: 'record-committed',
            record,
            pdfSha256,
          }),
        );
        await fs.rm(this.journalPath, { force: true });
      } catch (error) {
        await fs.rm(temporaryPdf, { force: true }).catch(() => undefined);
        throw error;
      }
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  recover(): Promise<void> {
    const operation = this.tail.then(() => this.recoverInternal());
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  private async recoverInternal(): Promise<void> {
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(this.journalPath, 'utf8')) as unknown;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new Error('Invoice recovery information is unreadable.');
    }
    const parsedJournal = issueJournalSchema.safeParse(raw);
    if (!parsedJournal.success)
      throw new Error('Invoice recovery information is invalid.');
    const journal = parsedJournal.data;
    const record = journal.record;
    const records = await this.readRecords();
    if (records.some((item) => item.id === record.id)) {
      await fs.rm(this.journalPath, { force: true });
      return;
    }
    if (records.some((item) => item.invoiceNumber === record.invoiceNumber))
      throw new Error(
        'Invoice recovery conflicts with an existing invoice number and was preserved.',
      );
    const temp = path.join(path.dirname(record.pdfPath), `.${record.id}.tmp`);
    const tempExists = await fs
      .access(temp)
      .then(() => true)
      .catch(() => false);
    const finalExists = await fs
      .access(record.pdfPath)
      .then(() => true)
      .catch(() => false);
    if (journal.state === 'prepared') {
      if (finalExists)
        throw new Error(
          'Invoice recovery found a conflicting PDF and preserved it for review.',
        );
      await fs.rm(temp, { force: true });
      await fs.rm(this.journalPath, { force: true });
      return;
    }
    if (!finalExists && !tempExists)
      throw new Error(
        'An incomplete invoice issue is preserved and needs review.',
      );
    if (tempExists && journal.pdfSha256) {
      const tempHash = createHash('sha256')
        .update(await fs.readFile(temp))
        .digest('hex');
      if (tempHash !== journal.pdfSha256)
        throw new Error(
          'Invoice recovery found an invalid temporary PDF and preserved it for review.',
        );
    }
    if (finalExists) {
      if (journal.pdfSha256) {
        const finalHash = createHash('sha256')
          .update(await fs.readFile(record.pdfPath))
          .digest('hex');
        if (finalHash !== journal.pdfSha256)
          throw new Error(
            'Invoice recovery found a conflicting PDF and preserved it for review.',
          );
      } else if (tempExists) {
        const [tempBytes, finalBytes] = await Promise.all([
          fs.readFile(temp),
          fs.readFile(record.pdfPath),
        ]);
        if (!tempBytes.equals(finalBytes))
          throw new Error(
            'Invoice recovery found a conflicting PDF and preserved it for review.',
          );
      } else {
        throw new Error(
          'Legacy invoice recovery cannot verify the existing PDF and preserved it for review.',
        );
      }
    } else if (tempExists) {
      await fs.copyFile(temp, record.pdfPath, 1);
    }
    const updated = persistedInvoiceArchiveSchema.parse({
      version: 1,
      invoices: [...records, record],
    });
    const indexTemp = `${this.indexPath}.tmp`;
    await fs.writeFile(indexTemp, JSON.stringify(updated, null, 2));
    await fs.rename(indexTemp, this.indexPath);
    await fs.rm(this.journalPath, { force: true });
    await fs.rm(temp, { force: true });
  }
  private async readRecords(): Promise<IssuedInvoice[]> {
    try {
      const parsed = persistedInvoiceArchiveSchema.parse(
        JSON.parse(await fs.readFile(this.indexPath, 'utf8')) as unknown,
      );
      return parsed.invoices;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new Error(
        'The issued invoice archive index is invalid and has been preserved.',
      );
    }
  }
}
