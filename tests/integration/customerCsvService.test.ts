import { promises as fs } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomerCsvService } from '../../src/main/services/customerCsvService';

const directories: string[] = [];
const headers =
  'id;name;email;phone;street;buildingnumber;postalcode;city;country;legacyNote;unused';
const original = `${headers}\r\n001;Élodie 李;elodie@example.ch;+41 79 12;Rue du Lac;02;0123;Genève;Suisse;"from; old csv";\r\n002;Other;other@example.ch;+41;Main;1;0001;Bern;CH;keep;\r\n`;
async function fixture(contents = original) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'invoice-csv-'));
  directories.push(directory);
  const file = path.join(directory, 'customers with spaces.csv');
  await writeFile(file, contents);
  return file;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
function customer(id = '001') {
  return {
    id,
    name: 'Élodie 李',
    email: 'elodie@example.ch',
    phone: '+41 79 123',
    address: {
      street: 'Rue du Lac',
      buildingNumber: '02',
      postalCode: '0123',
      city: 'Genève',
      country: 'Suisse',
    },
  };
}

describe('CustomerCsvService', () => {
  it('loads, edits, adds, and deletes while preserving dialect, headers, unknown data, and unrelated rows', async () => {
    const file = await fixture();
    const service = new CustomerCsvService();
    const loaded = await service.load(file);
    expect(loaded[0]?.name).toBe('Élodie 李');
    expect(loaded[0]?.address.postalCode).toBe('0123');
    await service.save({
      ...customer(),
      address: { ...customer().address, city: 'Lausanne' },
    });
    let saved = await readFile(file, 'utf8');
    expect(saved).toContain(
      '001;Élodie 李;elodie@example.ch;+41 79 123;Rue du Lac;02;0123;Lausanne;Suisse;"from; old csv";',
    );
    expect(saved).toContain(
      '002;Other;other@example.ch;+41;Main;1;0001;Bern;CH;keep;',
    );
    expect(saved).toContain('\r\n');
    await service.save({ ...customer('003'), name: '新規顧客' });
    expect(service.customers().map((item) => item.id)).toEqual([
      '001',
      '002',
      '003',
    ]);
    await service.delete('003');
    saved = await readFile(file, 'utf8');
    expect(saved).not.toContain('003;');
    expect(saved.startsWith(`${headers}\r\n`)).toBe(true);
  });
  it('creates and reloads a standard header-only customer CSV before adding a customer', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'invoice-csv-'));
    directories.push(directory);
    const file = path.join(directory, 'new-customers.csv');
    const service = new CustomerCsvService();
    await service.createEmptyFile(file);
    expect(await readFile(file, 'utf8')).toBe(
      'id;name;email;phone;street;buildingNumber;postalCode;city;country\r\n',
    );
    expect(await service.load(file)).toEqual([]);
    await service.save({ ...customer('new-id'), name: 'New customer' });
    expect(service.customers()).toMatchObject([
      { id: 'new-id', name: 'New customer' },
    ]);
  });
  it('explicitly initializes only an empty CSV and backs up the original', async () => {
    const file = await fixture('');
    const service = new CustomerCsvService();
    await service.initializeEmptyFile(file);
    expect(await readFile(file, 'utf8')).toBe(
      'id;name;email;phone;street;buildingNumber;postalCode;city;country\r\n',
    );
    expect(await readFile(`${file}.phase1-backup`, 'utf8')).toBe('');
    expect(await service.load(file)).toEqual([]);
  });
  it('leaves an external write intact if the empty file changes during initialization', async () => {
    const file = await fixture('');
    const service = new CustomerCsvService();
    const originalWriteFile = fs.writeFile.bind(fs);
    vi.spyOn(fs, 'writeFile').mockImplementation(
      async (target, data, options) => {
        if (String(target).endsWith('.phase1-backup'))
          await originalWriteFile(file, 'external content');
        return originalWriteFile(target, data, options);
      },
    );
    await expect(service.initializeEmptyFile(file)).rejects.toThrow(
      /changed outside the app/,
    );
    expect(await readFile(file, 'utf8')).toBe('external content');
  });
  it('refuses to overwrite an existing file or initialize a file that is no longer empty', async () => {
    const file = await fixture(original);
    const service = new CustomerCsvService();
    await expect(service.createEmptyFile(file)).rejects.toThrow(
      /already exists.*left unchanged/,
    );
    expect(await readFile(file, 'utf8')).toBe(original);

    const empty = await fixture('');
    await writeFile(empty, 'external content');
    await expect(service.initializeEmptyFile(empty)).rejects.toThrow(
      /no longer empty.*left unchanged/,
    );
    expect(await readFile(empty, 'utf8')).toBe('external content');
  });
  it('backs up the source before the first write', async () => {
    const file = await fixture();
    const service = new CustomerCsvService();
    await service.load(file);
    await service.save({ ...customer(), name: 'Changed' });
    expect(await readFile(`${file}.phase1-backup`, 'utf8')).toBe(original);
  });
  it('rejects content edits and file replacement before writing', async () => {
    const file = await fixture();
    const service = new CustomerCsvService();
    await service.load(file);
    await writeFile(file, original.replace('Other', 'External'));
    await expect(service.save(customer())).rejects.toThrow(
      /changed outside the app/,
    );
    expect(await readFile(file, 'utf8')).toContain('External');
    await service.load(file);
    const replacement = `${file}.replacement`;
    await writeFile(replacement, await readFile(file));
    await fs.rename(replacement, file);
    await expect(service.delete('001')).rejects.toThrow(
      /changed outside the app/,
    );
  });
  it('keeps the original file intact if safe replacement fails', async () => {
    const file = await fixture();
    const service = new CustomerCsvService();
    await service.load(file);
    const rename = vi
      .spyOn(fs, 'rename')
      .mockRejectedValueOnce(new Error('simulated replacement failure'));
    await expect(
      service.save({ ...customer(), name: 'Changed' }),
    ).rejects.toThrow('simulated replacement failure');
    rename.mockRestore();
    expect(await readFile(file, 'utf8')).toBe(original);
  });
  it('rejects empty, malformed, missing-header, duplicate-id, and non-UTF-8 files without discarding the loaded source', async () => {
    const file = await fixture();
    const service = new CustomerCsvService();
    await service.load(file);
    for (const invalid of [
      '',
      'id;name\r\n1;"broken\r\n',
      'id;name\r\n1;Ada\r\n',
      original.replace('002;Other', '001;Other'),
    ]) {
      const bad = await fixture(invalid);
      await expect(service.load(bad)).rejects.toThrow();
      expect(service.customers()[0]?.id).toBe('001');
    }
    const empty = await fixture('');
    await expect(service.load(empty)).rejects.toThrow(/CSV file is empty/);
    const binary = await fixture();
    await writeFile(binary, Buffer.from([0xff, 0xfe, 0xfd]));
    await expect(service.load(binary)).rejects.toThrow(/valid UTF-8/);
  });
  it('requires explicit selection when delimiter inspection is ambiguous', async () => {
    const file = await fixture('a,b;c\n1,2;3\n');
    const service = new CustomerCsvService();
    await expect(service.load(file)).rejects.toThrow(/ambiguous/);
  });
});
