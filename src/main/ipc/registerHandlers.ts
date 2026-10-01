import { ipcMain } from 'electron';
import { validateIpcSender } from '../security/validateIpcSender';
import type { Settings } from '../../shared/domain/settings';
import { SettingsStore } from '../services/settingsStore';
import { CustomerCsvService } from '../services/customerCsvService';
export function registerHandlers(
  store: SettingsStore,
  customers: CustomerCsvService,
): void {
  const wrap =
    (fn: (...args: unknown[]) => Promise<unknown>) =>
    async (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
      try {
        validateIpcSender(event);
        return { ok: true, value: await fn(...args) };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: 'operation_failed',
            message:
              error instanceof Error ? error.message : 'Operation failed.',
          },
        };
      }
    };
  ipcMain.handle(
    'settings:get',
    wrap(() => store.load()),
  );
  ipcMain.handle(
    'settings:save',
    wrap((s) => store.save(s as Settings)),
  );
  ipcMain.handle(
    'customers:load',
    wrap(async (p) => customers.load(String(p))),
  );
  ipcMain.handle(
    'customers:list',
    wrap(() => Promise.resolve(customers.customers())),
  );
  ipcMain.handle(
    'customers:save',
    wrap(async (c) => {
      await customers.save(c as never);
      return c;
    }),
  );
  ipcMain.handle(
    'customers:delete',
    wrap(async (id) => {
      await customers.delete(String(id));
      return undefined;
    }),
  );
}
