import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../src/shared/domain/settingsDefaults';
import type { InvoiceDraft } from '../../src/shared/domain/invoice';
import { DraftStore } from '../../src/main/services/draftStore';
import { InvoiceArchiveStore } from '../../src/main/services/invoiceArchiveStore';
import { InvoiceIssuanceService } from '../../src/main/services/invoiceIssuanceService';
import { SettingsStore } from '../../src/main/services/settingsStore';

vi.mock('../../src/main/services/qrBillService', () => ({
  createQrBillPdf: vi.fn(async () => new Uint8Array([4, 5, 6])),
}));
vi.mock('../../src/main/services/pdfAssemblyService', () => ({
  appendQrBillPage: vi.fn(async () => ({
    bytes: new Uint8Array([7, 8, 9]),
    invoicePageCount: 1,
    totalPageCount: 2,
  })),
}));

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('InvoiceIssuanceService', () => {
  it('retains the saved draft when PDF rendering fails', async () => {
    const fixture = await createFixture();
    const service = new InvoiceIssuanceService(
      fixture.settings,
      fixture.drafts,
      fixture.archive,
      async () => {
        throw new Error('Renderer failed');
      },
    );

    await expect(
      service.issue(fixture.draft, undefined, null, fixture.transactionId),
    ).rejects.toThrow('Renderer failed');

    await expect(fixture.drafts.load()).resolves.toEqual(fixture.draft);
    await expect(fixture.archive.list()).resolves.toEqual([]);
    await expect(fixture.settings.load()).resolves.toMatchObject({
      nextSequence: 1,
    });
  });

  it('returns the same archived invoice when retried by transaction ID', async () => {
    const fixture = await createFixture();
    const service = new InvoiceIssuanceService(
      fixture.settings,
      fixture.drafts,
      fixture.archive,
      async () => new Uint8Array([1, 2, 3]),
    );

    const first = await service.issue(
      fixture.draft,
      undefined,
      null,
      fixture.transactionId,
    );
    const retry = await service.issue(
      fixture.draft,
      undefined,
      null,
      fixture.transactionId,
    );

    expect(retry).toEqual(first);
    expect(await fixture.archive.list()).toHaveLength(1);
    await expect(fixture.drafts.load()).resolves.toBeNull();
    await expect(fixture.settings.load()).resolves.toMatchObject({
      nextSequence: 2,
    });
  });
});

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'invoice-issuance-'));
  directories.push(root);
  const userDataPath = path.join(root, 'app');
  const settings = new SettingsStore(userDataPath);
  const drafts = new DraftStore(userDataPath);
  const archive = new InvoiceArchiveStore(userDataPath);
  const customerId = 'a0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc';
  const draft: InvoiceDraft = {
    id: 'b0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
    invoiceDate: '2026-10-07',
    dueDate: '2026-11-06',
    currency: 'CHF',
    suggestedNumber: 'RE-2026-001',
    customerId,
    customer: {
      id: customerId,
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
    lines: [
      {
        id: 'c0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc',
        description: 'Work',
        hours: '1',
        rate: '10',
      },
    ],
    template: 'classic',
    notes: '',
    invoiceFooter: '',
    dueDateMode: 'automatic',
  };
  const transactionId = 'd0b9d3e1-69db-4e48-8d0b-9fb7ad1d7abc';
  await settings.savePreferences({
    ...defaultSettings,
    invoiceYear: '2026',
    archivePath: path.join(root, 'archive'),
  });
  await drafts.save(draft);

  return { settings, drafts, archive, draft, transactionId };
}
