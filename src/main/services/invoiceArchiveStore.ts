import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  InvoiceArchiveEntry,
  IssuedInvoice,
} from '../../shared/domain/issuedInvoice';
import { persistedInvoiceArchiveSchema } from '../../shared/validation/issuedInvoiceValidation';

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
      await fs
        .writeFile(
          this.journalPath,
          JSON.stringify({ version: 1, state: 'prepared', record }),
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
          JSON.stringify({ version: 1, state: 'pdf-written', record }),
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
          JSON.stringify({ version: 1, state: 'record-committed', record }),
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
    const journal = raw as { state?: string; record?: IssuedInvoice };
    if (
      !journal.record ||
      !['prepared', 'pdf-written', 'record-committed'].includes(
        journal.state ?? '',
      )
    )
      throw new Error('Invoice recovery information is invalid.');
    const record = journal.record;
    const records = await this.readRecords();
    if (records.some((item) => item.id === record.id)) {
      await fs.rm(this.journalPath, { force: true });
      return;
    }
    const temp = path.join(path.dirname(record.pdfPath), `.${record.id}.tmp`);
    const tempExists = await fs
      .access(temp)
      .then(() => true)
      .catch(() => false);
    const finalExists = await fs
      .access(record.pdfPath)
      .then(() => true)
      .catch(() => false);
    if (journal.state === 'prepared' && !finalExists) {
      await fs.rm(temp, { force: true });
      await fs.rm(this.journalPath, { force: true });
      return;
    }
    if (!finalExists && tempExists) await fs.copyFile(temp, record.pdfPath, 1);
    else if (!finalExists)
      throw new Error(
        'An incomplete invoice issue is preserved and needs review.',
      );
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
