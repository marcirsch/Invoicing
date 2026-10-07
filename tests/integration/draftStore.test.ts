import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DraftStore } from '../../src/main/services/draftStore';
import type { InvoiceDraft } from '../../src/shared/domain/invoice';

let directory = '';
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});
describe('DraftStore', () => {
  it('returns null when absent and round-trips saved drafts', async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'invoice-draft-'));
    const store = new DraftStore(directory);
    expect(await store.load()).toBeNull();
    const draft: InvoiceDraft = {
      id: '00000000-0000-4000-8000-000000000000',
      invoiceDate: '2025-01-01',
      dueDate: '2025-01-31',
      currency: 'CHF',
      suggestedNumber: 'RE-2025-001',
      customerId: null,
      customer: null,
      sender: {
        name: '',
        address: {
          street: '',
          buildingNumber: '',
          postalCode: '',
          city: '',
          country: '',
        },
        phone: '',
        email: '',
        website: '',
        iban: '',
        bankName: '',
        logoDataUrl: null,
      },
      lines: [],
      template: 'classic',
      notes: '',
      invoiceFooter: '',
      dueDateMode: 'automatic',
    };
    await store.save(draft);
    expect(await store.load()).toEqual(draft);
  });
});
