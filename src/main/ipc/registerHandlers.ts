import { ipcMain } from 'electron';
import { z } from 'zod';
import type { CsvDelimiter } from '../../shared/csv/dialect';
import { validateIpcSender } from '../security/validateIpcSender';
import { CustomerCsvService } from '../services/customerCsvService';
import { SettingsStore } from '../services/settingsStore';
import { registerCustomerHandlers } from './customerHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { DraftStore } from '../services/draftStore';
import { invoiceDraftSchema } from '../../shared/validation/invoiceValidation';
import { InvoiceArchiveStore } from '../services/invoiceArchiveStore';
import {
  InvoiceIssueError,
  InvoiceIssuanceService,
} from '../services/invoiceIssuanceService';
import { registerInvoiceHandlers } from './invoiceHandlers';

function safeFailure(error: unknown, fallback: string) {
  if (error instanceof InvoiceIssueError)
    return {
      ok: false,
      error: { code: error.code, message: error.message },
    };
  if (error instanceof z.ZodError)
    return {
      ok: false,
      error: {
        code: 'invalid_input',
        message: 'Some fields are invalid. Check the form and try again.',
      },
    };
  if (error instanceof Error && /delimiter is ambiguous/.test(error.message))
    return {
      ok: false,
      error: {
        code: 'dialect_ambiguous',
        message:
          'The CSV delimiter is unclear. Choose the character used to separate columns.',
      },
    };
  if (error instanceof Error && /saved invoice draft/.test(error.message))
    return {
      ok: false,
      error: { code: 'draft_recovery', message: error.message },
    };
  if (error instanceof Error && /changed outside the app/.test(error.message))
    return { ok: false, error: { code: 'conflict', message: error.message } };
  if (
    error instanceof Error &&
    /^(The selected logo|Choose a valid PNG)/.test(error.message)
  )
    return {
      ok: false,
      error: { code: 'invalid_logo', message: error.message },
    };
  if (
    error instanceof Error &&
    /^(Select a customer|Choose a customer|The customer CSV|CSV is missing|required columns|CSV contains duplicate|CSV customer records|This file is not valid|CSV content|CSV rows)/.test(
      error.message,
    )
  )
    return { ok: false, error: { code: 'data_error', message: error.message } };
  return { ok: false, error: { code: 'operation_failed', message: fallback } };
}

export function registerHandlers(
  store: SettingsStore,
  customers: CustomerCsvService,
  drafts: DraftStore,
  archive?: InvoiceArchiveStore,
  issuance?: InvoiceIssuanceService,
): void {
  const register = (
    channel: string,
    operation: (
      event: Electron.IpcMainInvokeEvent,
      ...args: unknown[]
    ) => Promise<unknown>,
  ) => {
    ipcMain.handle(channel, async (event, ...args: unknown[]) => {
      try {
        validateIpcSender(event);
        return { ok: true, value: await operation(event, ...args) };
      } catch (error) {
        const fallback = channel.startsWith('customers:')
          ? 'Could not complete the customer operation. Check the selected file and its permissions.'
          : channel === 'invoice:issue'
            ? 'Could not issue the invoice. Your draft is retained; check the archive folder and try again.'
            : 'Could not read or save settings.';
        return safeFailure(error, fallback);
      }
    });
  };
  let pendingCsvPath: string | null = null;
  const loadCsv = async (filePath: string, delimiter?: CsvDelimiter) => {
    const loaded = await customers.load(filePath, delimiter);
    const settings = await store.load();
    if (settings.csvPath !== filePath)
      await store.savePreferences({ ...settings, csvPath: filePath });
    pendingCsvPath = null;
    return loaded;
  };
  registerSettingsHandlers(register, store, loadCsv, (path) => {
    pendingCsvPath = path;
  });
  registerCustomerHandlers(
    register,
    store,
    customers,
    loadCsv,
    () => pendingCsvPath,
  );
  register('draft:load', async () => drafts.load());
  register('draft:save', async (_event, payload) =>
    drafts.save(invoiceDraftSchema.parse(payload)),
  );
  if (archive && issuance) registerInvoiceHandlers(register, archive, issuance);
}

export type HandlerRegistrar = (
  channel: string,
  operation: (
    event: Electron.IpcMainInvokeEvent,
    ...args: unknown[]
  ) => Promise<unknown>,
) => void;
