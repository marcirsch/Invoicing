import { z } from 'zod';
import type { CsvDelimiter } from '../../shared/csv/dialect';
import { customerSchema } from '../../shared/validation/customerValidation';
import type { CustomerCsvService } from '../services/customerCsvService';
import type { SettingsStore } from '../services/settingsStore';
import type { HandlerRegistrar } from './registerHandlers';

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
}
