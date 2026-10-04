import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { InvoiceDraft } from '../../shared/domain/invoice';
import { persistedDraftSchema } from '../../shared/validation/invoiceValidation';

export class DraftStore {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private readonly userDataPath: string) {}
  private get filePath(): string {
    return path.join(this.userDataPath, 'invoice-draft.json');
  }
  async load(): Promise<InvoiceDraft | null> {
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(this.filePath, 'utf8')) as unknown;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new Error(
        'The saved invoice draft could not be read. It has been preserved.',
      );
    }
    const parsed = persistedDraftSchema.safeParse(raw);
    if (!parsed.success)
      throw new Error(
        'The saved invoice draft is invalid. It has been preserved; move or repair invoice-draft.json to continue.',
      );
    return parsed.data.draft;
  }
  save(draft: InvoiceDraft): Promise<InvoiceDraft> {
    const operation = this.tail.then(async () => {
      const valid = persistedDraftSchema.parse({ version: 1, draft }).draft;
      await fs.mkdir(this.userDataPath, { recursive: true });
      const temp = `${this.filePath}.${process.pid}.tmp`;
      await fs.writeFile(
        temp,
        JSON.stringify({ version: 1, draft: valid }, null, 2),
        'utf8',
      );
      try {
        if (process.platform === 'win32') {
          const previous = `${this.filePath}.previous`;
          try {
            await fs.rename(this.filePath, previous);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          try {
            await fs.rename(temp, this.filePath);
          } catch (error) {
            await fs.rename(previous, this.filePath).catch(() => undefined);
            throw error;
          }
          await fs.rm(previous, { force: true });
        } else await fs.rename(temp, this.filePath);
      } catch (error) {
        await fs.rm(temp, { force: true }).catch(() => undefined);
        throw error;
      }
      return valid;
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  async clear(): Promise<void> {
    await this.tail;
    await fs.rm(this.filePath, { force: true });
  }
}
