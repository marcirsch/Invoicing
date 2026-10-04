import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi, Result } from '../shared/ipc/contracts';
import type { Customer } from '../shared/domain/customer';
import type { Settings } from '../shared/domain/settings';

const api: IpcApi = {
  getSettings: () =>
    ipcRenderer.invoke('settings:get') as Promise<Result<Settings>>,
  saveSettings: (settings) =>
    ipcRenderer.invoke('settings:save', settings) as Promise<Result<Settings>>,
  selectCsv: () =>
    ipcRenderer.invoke('settings:select-csv') as Promise<Result<string | null>>,
  selectArchiveFolder: () =>
    ipcRenderer.invoke('settings:select-archive') as Promise<
      Result<string | null>
    >,
  loadCustomers: (delimiter) =>
    ipcRenderer.invoke('customers:select', delimiter) as Promise<
      Result<Customer[]>
    >,
  listCustomers: () =>
    ipcRenderer.invoke('customers:list') as Promise<Result<Customer[]>>,
  saveCustomer: (customer) =>
    ipcRenderer.invoke('customers:save', customer) as Promise<
      Result<Customer[]>
    >,
  deleteCustomer: (id) =>
    ipcRenderer.invoke('customers:delete', id) as Promise<Result<Customer[]>>,
  reloadCustomers: () =>
    ipcRenderer.invoke('customers:reload') as Promise<Result<Customer[]>>,
};

contextBridge.exposeInMainWorld('invoicing', api);
