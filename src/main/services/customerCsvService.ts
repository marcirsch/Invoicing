import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  parseCsv,
  serializeCsv,
  type CsvDocument,
} from '../../shared/csv/csvDocument';
import { detectDialect } from '../../shared/csv/dialect';
import type { Customer } from '../../shared/domain/customer';
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
export class CustomerCsvService {
  private document?: CsvDocument;
  private fingerprint?: string;
  private sourcePath?: string;
  async load(filePath: string): Promise<Customer[]> {
    const text = await fs.readFile(filePath, 'utf8');
    this.document = parseCsv(text, detectDialect(text));
    this.sourcePath = filePath;
    this.fingerprint = hash(text);
    return this.toCustomers();
  }
  private toCustomers(): Customer[] {
    if (!this.document) return [];
    const index = Object.fromEntries(
      fields.map((f) => [f, this.document!.headers.indexOf(f)]),
    );
    return this.document.rows.map((row, i) => ({
      id: val(row, index.id) || String(i + 1),
      name: val(row, index.name),
      email: val(row, index.email),
      phone: val(row, index.phone),
      address: {
        street: val(row, index.street),
        buildingNumber: val(row, index.buildingNumber),
        postalCode: val(row, index.postalCode),
        city: val(row, index.city),
        country: val(row, index.country),
      },
    }));
  }
  async save(customer: Customer): Promise<void> {
    if (!this.document || !this.sourcePath || !this.fingerprint)
      throw new Error('No customer CSV is loaded.');
    const current = hash(await fs.readFile(this.sourcePath, 'utf8'));
    if (current !== this.fingerprint)
      throw new Error(
        'The customer CSV changed externally. Reload it before saving.',
      );
    const indexes = Object.fromEntries(
      fields.map((f) => [f, this.document!.headers.indexOf(f)]),
    );
    let row = this.document.rows.find(
      (r) => val(r, indexes.id) === customer.id,
    );
    if (!row) {
      row = new Array(this.document.headers.length).fill('');
      this.document.rows.push(row);
    }
    const values = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      ...customer.address,
    };
    for (const field of fields) {
      const index = indexes[field];
      if (index >= 0) row[index] = values[field];
    }
    await this.replace();
  }
  async delete(id: string): Promise<void> {
    if (!this.document) throw new Error('No customer CSV is loaded.');
    const index = this.document.headers.indexOf('id');
    this.document.rows = this.document.rows.filter((r) => val(r, index) !== id);
    await this.replace();
  }
  private async replace(): Promise<void> {
    const output = serializeCsv(this.document!);
    const temp = `${this.sourcePath!}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temp, output, 'utf8');
    await fs.rename(temp, this.sourcePath!);
    this.fingerprint = hash(output);
  }
  customers(): Customer[] {
    return this.toCustomers();
  }
}
function val(row: string[], index: number): string {
  return index >= 0 ? (row[index] ?? '') : '';
}
function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
