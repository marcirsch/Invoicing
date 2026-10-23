import { z } from 'zod';
import { BrowserWindow } from 'electron';
import type { CsvDelimiter } from '../../shared/csv/dialect';
import { customerSchema } from '../../shared/validation/customerValidation';
import type { CustomerCsvService } from '../services/customerCsvService';
import type { SettingsStore } from '../services/settingsStore';
import type { HandlerRegistrar } from './registerHandlers';
import { createCsvPath } from '../services/fileDialogService';

type CsvLoader = (path: string, delimiter?: CsvDelimiter) => Promise<unknown>;
export function registerCustomerHandlers(
  register: HandlerRegistrar,
  store: SettingsStore,
  customers: CustomerCsvService,
  loadCsv: CsvLoader,
  getPendingPath: () => string | null,
): void {
  register('customers:select', async (_event, delimiter) => {
    const settings = await store.load();
    const filePath = getPendingPath() ?? settings.csvPath;
    if (!filePath) return [];
    const selectedDelimiter =
      delimiter === undefined
        ? undefined
        : (z.enum([',', ';', '\t']).parse(delimiter) as CsvDelimiter);
    return loadCsv(filePath, selectedDelimiter);
  });
  register('customers:list', async () => {
    if (!customers.path) {
      const settings = await store.load();
      if (settings.csvPath) return loadCsv(settings.csvPath);
    }
    return customers.customers();
  });
  register('customers:reload', async () => {
    const filePath = customers.path ?? getPendingPath();
    if (!filePath) throw new Error('Select a customer CSV file first.');
    return loadCsv(filePath);
  });
  register('customers:save', async (_event, payload) =>
    customers.save(customerSchema.parse(payload)),
  );
  register('customers:delete', async (_event, payload) =>
    customers.delete(z.string().min(1).parse(payload)),
  );
  register('customers:create-csv', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) throw new Error('The application window is unavailable.');
    const filePath = await createCsvPath(window);
    if (!filePath) return null;
    await customers.createEmptyFile(filePath);
    await loadCsv(filePath);
    return filePath;
  });
  register('customers:initialize-empty-csv', async () => {
    const filePath = getPendingPath() ?? (await store.load()).csvPath;
    if (!filePath)
      throw new Error('Select an empty customer CSV before initializing it.');
    await customers.initializeEmptyFile(filePath);
    await loadCsv(filePath);
    return filePath;
  });
}
