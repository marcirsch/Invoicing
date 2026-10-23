import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IssuedInvoice } from '../../src/shared/domain/issuedInvoice';
import { InvoiceArchiveStore } from '../../src/main/services/invoiceArchiveStore';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('InvoiceArchiveStore', () => {
  it('commits immutable snapshot metadata and does not overwrite PDF files', async () => {
    const fixture = await createFixture();
    await fixture.store.commit(fixture.record, fixture.pdfBytes);

    expect(await fixture.store.read(fixture.record.id)).toEqual(fixture.record);
    expect((await fixture.store.list())[0]?.pdfAvailable).toBe(true);
    await expect(
      fixture.store.commit(
        {
          ...fixture.record,
          id: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
          transactionId: 'd0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
          sourceDraftId: 'e0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
        },
        new Uint8Array([9]),
      ),
    ).rejects.toThrow(/already exists/);
    expect([...(await readFile(fixture.record.pdfPath))]).toEqual([
      ...fixture.pdfBytes,
    ]);
  });

  it('cleans a prepared transaction with no final PDF', async () => {
    const fixture = await createFixture();
    await writeFile(fixture.tempPath, fixture.pdfBytes);
    await fixture.writeJournal('prepared');

    await fixture.store.recover();

    await expect(readFile(fixture.tempPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(readFile(fixture.journalPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(fixture.store.list()).resolves.toEqual([]);
  });

  it('recovers a pdf-written transaction from its temporary PDF idempotently', async () => {
    const fixture = await createFixture();
    await writeFile(fixture.tempPath, fixture.pdfBytes);
    await fixture.writeJournal('pdf-written');

    await fixture.store.recover();
    await fixture.store.recover();

    expect([...(await readFile(fixture.record.pdfPath))]).toEqual([
      ...fixture.pdfBytes,
    ]);
    expect(await fixture.store.read(fixture.record.id)).toEqual(fixture.record);
    expect(await fixture.store.list()).toHaveLength(1);
    await expect(readFile(fixture.journalPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('indexes a verified final PDF when the archive index write was interrupted', async () => {
    const fixture = await createFixture();
    await writeFile(fixture.record.pdfPath, fixture.pdfBytes);
    await fixture.writeJournal('pdf-written');

    await fixture.store.recover();

    expect(await fixture.store.read(fixture.record.id)).toEqual(fixture.record);
    expect(await fixture.store.list()).toHaveLength(1);
  });

  it('recovers a legacy journal when its temporary and final PDFs match', async () => {
    const fixture = await createFixture();
    await writeFile(fixture.tempPath, fixture.pdfBytes);
    await writeFile(fixture.record.pdfPath, fixture.pdfBytes);
    await fixture.writeJournal('pdf-written', false);

    await fixture.store.recover();

    expect(await fixture.store.read(fixture.record.id)).toEqual(fixture.record);
    expect(await fixture.store.list()).toHaveLength(1);
  });

  it('removes a stale journal when the record is already indexed', async () => {
    const fixture = await createFixture();
    await fixture.store.commit(fixture.record, fixture.pdfBytes);
    await fixture.writeJournal('record-committed');

    await fixture.store.recover();

    expect(await fixture.store.list()).toHaveLength(1);
    await expect(readFile(fixture.journalPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves malformed and invalid journal files', async () => {
    const fixture = await createFixture();
    await writeFile(fixture.journalPath, '{not json');

    await expect(fixture.store.recover()).rejects.toThrow(/unreadable/);
    expect(await readFile(fixture.journalPath, 'utf8')).toBe('{not json');

    await writeFile(
      fixture.journalPath,
      JSON.stringify({ version: 1, state: 'unknown', record: fixture.record }),
    );
    const invalidJournal = await readFile(fixture.journalPath, 'utf8');
    await expect(fixture.store.recover()).rejects.toThrow(/invalid/);
    expect(await readFile(fixture.journalPath, 'utf8')).toBe(invalidJournal);
  });

  it('preserves a conflicting PDF instead of indexing or overwriting it', async () => {
    const fixture = await createFixture();
    const conflictingBytes = new Uint8Array([7, 8, 9]);
    await writeFile(fixture.record.pdfPath, conflictingBytes);
    await fixture.writeJournal('prepared');

    await expect(fixture.store.recover()).rejects.toThrow(/conflicting PDF/);

    expect([...(await readFile(fixture.record.pdfPath))]).toEqual([
      ...conflictingBytes,
    ]);
    expect(await readFile(fixture.journalPath, 'utf8')).toContain('prepared');
    await expect(fixture.store.list()).rejects.toThrow(/conflicting PDF/);
  });

  it('preserves an incomplete pdf-written transaction when its expected PDF is missing', async () => {
    const fixture = await createFixture();
    await fixture.writeJournal('pdf-written');

    await expect(fixture.store.recover()).rejects.toThrow(/incomplete/);

    expect(await readFile(fixture.journalPath, 'utf8')).toContain(
      'pdf-written',
    );
    await expect(readFile(fixture.record.pdfPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects a final PDF whose contents do not match the journal digest', async () => {
    const fixture = await createFixture();
    const conflictingBytes = new Uint8Array([1, 4, 1, 4]);
    await writeFile(fixture.record.pdfPath, conflictingBytes);
    await fixture.writeJournal('pdf-written');

    await expect(fixture.store.recover()).rejects.toThrow(/conflicting PDF/);

    expect([...(await readFile(fixture.record.pdfPath))]).toEqual([
      ...conflictingBytes,
    ]);
    await expect(fixture.store.list()).rejects.toThrow(/conflicting PDF/);
  });
});

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'invoice-archive-'));
  directories.push(root);
  const userDataPath = path.join(root, 'app');
  const target = path.join(root, 'out', 'RE-001.pdf');
  const record: IssuedInvoice = {
    schemaVersion: 1,
    id: 'a0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
    transactionId: 'b0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
    sourceDraftId: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
    invoiceNumber: 'RE-001',
    issuedAt: '2026-10-07T10:00:00.000Z',
    invoiceDate: '2026-10-07',
    dueDate: '2026-11-06',
    currency: 'CHF',
    sender: {
      name: 'Firma',
      address: {
        street: 'A',
        buildingNumber: '1',
        postalCode: '8000',
        city: 'Zürich',
        country: 'CH',
      },
      phone: '',
      email: '',
      website: '',
      iban: 'CH9300762011623852957',
      bankName: '',
      logoDataUrl: null,
    },
    recipient: {
      id: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
      name: 'Kunde',
      email: '',
      phone: '',
      address: {
        street: 'B',
        buildingNumber: '2',
        postalCode: '8001',
        city: 'Zürich',
        country: 'CH',
      },
    },
    lines: [
      {
        id: 'd0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
        description: 'Work',
        hours: '1',
        rate: '10',
      },
    ],
    lineTotalsCents: ['1000'],
    totalCents: '1000',
    template: 'classic',
    notes: '',
    invoiceFooter: '',
    pdfPath: target,
    replacesInvoiceId: null,
  };
  const pdfBytes = new Uint8Array([1, 2, 3]);
  const journalPath = path.join(userDataPath, 'invoice-issue-journal.json');
  const tempPath = path.join(path.dirname(target), `.${record.id}.tmp`);
  const store = new InvoiceArchiveStore(userDataPath);
  await Promise.all([
    mkdir(userDataPath, { recursive: true }),
    mkdir(path.dirname(target), { recursive: true }),
  ]);

  return {
    record,
    pdfBytes,
    store,
    tempPath,
    journalPath,
    writeJournal: async (
      state: 'prepared' | 'pdf-written' | 'record-committed',
      withDigest = true,
    ) => {
      const pdfSha256 = createHash('sha256').update(pdfBytes).digest('hex');
      await writeFile(
        journalPath,
        JSON.stringify({
          version: 1,
          state,
          record,
          ...(withDigest ? { pdfSha256 } : {}),
        }),
      );
    },
  };
}
