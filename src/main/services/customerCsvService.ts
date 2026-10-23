import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  parseCsv,
  serializeCsv,
  type CsvDocument,
} from '../../shared/csv/csvDocument';
import { detectDialect, type CsvDelimiter } from '../../shared/csv/dialect';
import type { Customer } from '../../shared/domain/customer';
import { customerSchema } from '../../shared/validation/customerValidation';

const fields = [
  'id',
  'name',
  'email',
  'phone',
  'street',
  'buildingNumber',
  'postalCode',
  'city',
  'country',
] as const;
const defaultDialect = {
  delimiter: ';',
  lineEnding: '\r\n',
  bom: false,
  finalNewline: true,
} as const;
type Field = (typeof fields)[number];
interface FileIdentity {
  dev: number;
  ino: number;
}

/** Maintains one selected customer CSV and guards every mutation with its loaded fingerprint. */
export class CustomerCsvService {
  private document?: CsvDocument;
  private fingerprint?: string;
  private identity?: FileIdentity;
  private sourcePath?: string;
  private selectedDelimiter?: CsvDelimiter;

  async load(
    filePath: string,
    selectedDelimiter?: CsvDelimiter,
  ): Promise<Customer[]> {
    const bytes = await fs.readFile(filePath);
    if (bytes.length === 0)
      throw new Error(
        'CSV file is empty. Initialize it with the standard customer columns or choose a different file.',
      );
    const text = bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(bytes))
      throw new Error(
        'This file is not valid UTF-8. The original was left unchanged.',
      );
    const resolvedPath = path.resolve(filePath);
    const effectiveDelimiter =
      selectedDelimiter ??
      (this.sourcePath === resolvedPath ? this.selectedDelimiter : undefined);
    const dialect = detectDialect(text, effectiveDelimiter);
    const document = parseCsv(text, dialect);
    const normalizedHeaders = document.headers.map((header) =>
      header.trim().toLowerCase(),
    );
    const missing = fields.filter(
      (field) => !normalizedHeaders.includes(field.toLowerCase()),
    );
    if (missing.length)
      throw new Error(
        `CSV is missing required columns: ${missing.join(', ')}. Add or map these columns before using it.`,
      );
    if (new Set(normalizedHeaders).size !== normalizedHeaders.length)
      throw new Error(
        'CSV contains duplicate column names. Rename duplicates before loading it.',
      );
    const idColumn = normalizedHeaders.indexOf('id');
    const mappedIndexes = fields.map((field) =>
      normalizedHeaders.indexOf(field.toLowerCase()),
    );
    const customerRows = document.rows.filter((row) =>
      mappedIndexes.some((index) => cell(row, index) !== ''),
    );
    if (customerRows.some((row) => !cell(row, idColumn)))
      throw new Error(
        'CSV customer records need nonempty IDs. Add unique IDs before loading the file.',
      );
    if (
      new Set(customerRows.map((row) => cell(row, idColumn))).size !==
      customerRows.length
    )
      throw new Error(
        'CSV contains duplicate customer IDs. Correct them before loading it.',
      );
    const stat = await fs.stat(filePath);
    this.document = document;
    this.sourcePath = resolvedPath;
    this.selectedDelimiter = dialect.delimiter;
    this.fingerprint = hash(bytes);
    this.identity = { dev: stat.dev, ino: stat.ino };
    return this.toCustomers();
  }

  async createEmptyFile(filePath: string): Promise<void> {
    const content = serializeCsv({
      headers: [...fields],
      rows: [],
      dialect: { ...defaultDialect },
    });
    let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
    try {
      handle = await fs.open(filePath, 'wx');
      await handle.writeFile(content, 'utf8');
      await handle.sync();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        throw new Error(
          'A CSV file already exists at that location. Choose a different name; the existing file was left unchanged.',
        );
      if (handle) {
        const opened = await handle.stat().catch(() => null);
        const current = await fs.stat(filePath).catch(() => null);
        if (
          opened &&
          current &&
          opened.dev === current.dev &&
          opened.ino === current.ino
        )
          await fs.unlink(filePath).catch(() => undefined);
      }
      throw error;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  async initializeEmptyFile(filePath: string): Promise<void> {
    const resolvedPath = path.resolve(filePath);
    const bytes = await fs.readFile(resolvedPath);
    if (bytes.length !== 0)
      throw new Error(
        'The selected CSV is no longer empty. It was left unchanged; reload or choose a different file.',
      );
    const stat = await fs.stat(resolvedPath);
    const previous = {
      document: this.document,
      fingerprint: this.fingerprint,
      identity: this.identity,
      sourcePath: this.sourcePath,
      selectedDelimiter: this.selectedDelimiter,
    };
    this.document = {
      headers: [...fields],
      rows: [],
      dialect: { ...defaultDialect },
    };
    this.fingerprint = hash(bytes);
    this.identity = { dev: stat.dev, ino: stat.ino };
    this.sourcePath = resolvedPath;
    this.selectedDelimiter = defaultDialect.delimiter;
    try {
      await this.assertUnchanged();
      await this.writeRows([]);
    } catch (error) {
      this.document = previous.document;
      this.fingerprint = previous.fingerprint;
      this.identity = previous.identity;
      this.sourcePath = previous.sourcePath;
      this.selectedDelimiter = previous.selectedDelimiter;
      throw error;
    }
  }

  private columnIndexes(): Record<Field, number> {
    if (!this.document) throw new Error('Select a customer CSV file first.');
    return Object.fromEntries(
      fields.map((field) => [
        field,
        this.document!.headers.findIndex(
          (header) => header.trim().toLowerCase() === field.toLowerCase(),
        ),
      ]),
    ) as Record<Field, number>;
  }

  private toCustomers(): Customer[] {
    if (!this.document) return [];
    const indexes = this.columnIndexes();
    return this.document.rows
      .filter((row) => fields.some((field) => cell(row, indexes[field]) !== ''))
      .map((row) => ({
        id: cell(row, indexes.id),
        name: cell(row, indexes.name),
        email: cell(row, indexes.email),
        phone: cell(row, indexes.phone),
        address: {
          street: cell(row, indexes.street),
          buildingNumber: cell(row, indexes.buildingNumber),
          postalCode: cell(row, indexes.postalCode),
          city: cell(row, indexes.city),
          country: cell(row, indexes.country),
        },
      }));
  }

  async save(input: Customer): Promise<Customer[]> {
    const customer = customerSchema.parse(input);
    await this.assertUnchanged();
    const indexes = this.columnIndexes();
    const rowIndex = this.document!.rows.findIndex(
      (row) => cell(row, indexes.id) === customer.id,
    );
    const values: Record<Field, string> = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      street: customer.address.street,
      buildingNumber: customer.address.buildingNumber,
      postalCode: customer.address.postalCode,
      city: customer.address.city,
      country: customer.address.country,
    };
    const row =
      rowIndex < 0
        ? new Array(this.document!.headers.length).fill('')
        : [...this.document!.rows[rowIndex]!];
    for (const field of fields) row[indexes[field]] = values[field];
    const nextRows = [...this.document!.rows];
    if (rowIndex < 0) nextRows.push(row);
    else nextRows[rowIndex] = row;
    await this.writeRows(nextRows);
    return this.toCustomers();
  }

  async delete(id: string): Promise<Customer[]> {
    if (!id) throw new Error('Choose a customer to delete.');
    await this.assertUnchanged();
    const indexes = this.columnIndexes();
    const nextRows = this.document!.rows.filter(
      (row) => cell(row, indexes.id) !== id,
    );
    if (nextRows.length === this.document!.rows.length)
      throw new Error(
        'That customer no longer exists. Reload the CSV and try again.',
      );
    await this.writeRows(nextRows);
    return this.toCustomers();
  }

  customers(): Customer[] {
    return this.toCustomers();
  }
  get path(): string | null {
    return this.sourcePath ?? null;
  }

  private async assertUnchanged(): Promise<void> {
    if (
      !this.document ||
      !this.sourcePath ||
      !this.fingerprint ||
      !this.identity
    )
      throw new Error('Select a customer CSV file first.');
    const [bytes, stat] = await Promise.all([
      fs.readFile(this.sourcePath),
      fs.stat(this.sourcePath),
    ]);
    if (
      stat.dev !== this.identity.dev ||
      stat.ino !== this.identity.ino ||
      hash(bytes) !== this.fingerprint
    ) {
      throw new Error(
        'The customer CSV changed outside the app. Reload it before saving; your unsaved changes are still available.',
      );
    }
  }

  private async writeRows(rows: string[][]): Promise<void> {
    const nextDocument: CsvDocument = { ...this.document!, rows };
    const output = serializeCsv(nextDocument);
    const target = this.sourcePath!;
    const temp = path.join(
      path.dirname(target),
      `.${path.basename(target)}.${crypto.randomUUID()}.tmp`,
    );
    const backup = `${target}.phase1-backup`;
    const original = await fs.readFile(target);
    const mode = (await fs.stat(target)).mode;
    let transientOriginal: string | undefined;
    try {
      try {
        await fs.access(backup);
      } catch {
        await fs.writeFile(backup, original, { mode });
      }
      await fs.writeFile(temp, output, { encoding: 'utf8', mode });
      await this.assertUnchanged();
      if (process.platform === 'win32') {
        transientOriginal = `${target}.${crypto.randomUUID()}.old`;
        await fs.rename(target, transientOriginal);
        try {
          await fs.rename(temp, target);
        } catch (error) {
          await fs.rename(transientOriginal, target);
          transientOriginal = undefined;
          throw error;
        }
        await fs.unlink(transientOriginal);
      } else {
        await fs.rename(temp, target);
      }
      const stat = await fs.stat(target);
      this.document = nextDocument;
      this.fingerprint = hash(Buffer.from(output, 'utf8'));
      this.identity = { dev: stat.dev, ino: stat.ino };
    } catch (error) {
      await fs.rm(temp, { force: true }).catch(() => undefined);
      if (transientOriginal)
        await fs.rename(transientOriginal, target).catch(() => undefined);
      throw error;
    }
  }
}

function cell(row: string[], index: number): string {
  return row[index] ?? '';
}
function hash(input: Uint8Array): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
