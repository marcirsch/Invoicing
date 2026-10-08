import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
    const root = await mkdtemp(path.join(os.tmpdir(), 'invoice-archive-'));
    directories.push(root);
    const target = path.join(root, 'out', 'RE-001.pdf');
    const store = new InvoiceArchiveStore(path.join(root, 'app'));
    const record = {
      schemaVersion: 1 as const,
      id: 'a0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
      transactionId: 'b0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
      sourceDraftId: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
      invoiceNumber: 'RE-001',
      issuedAt: '2026-10-07T10:00:00.000Z',
      invoiceDate: '2026-10-07',
      dueDate: '2026-11-06',
      currency: 'CHF' as const,
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
        iban: 'CH4431999123000889012',
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
      template: 'classic' as const,
      notes: '',
      invoiceFooter: '',
      pdfPath: target,
      replacesInvoiceId: null,
    };
    await store.commit(record, new Uint8Array([1, 2, 3]));
    expect(await store.read(record.id)).toEqual(record);
    expect((await store.list())[0]?.pdfAvailable).toBe(true);
    await expect(
      store.commit(
        {
          ...record,
          id: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
          transactionId: 'd0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
          sourceDraftId: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
        },
        new Uint8Array([9]),
      ),
    ).rejects.toThrow(/already exists/);
    expect([...(await readFile(target))]).toEqual([1, 2, 3]);
  });
});
