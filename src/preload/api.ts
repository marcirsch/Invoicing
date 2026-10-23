import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi, Result } from '../shared/ipc/contracts';
import type { Customer } from '../shared/domain/customer';
import type { Settings } from '../shared/domain/settings';
import type { InvoiceDraft } from '../shared/domain/invoice';
import type {
  IssuedInvoice,
  InvoiceArchiveEntry,
} from '../shared/domain/issuedInvoice';

const api: IpcApi = {
  loadDraft: () =>
    ipcRenderer.invoke('draft:load') as Promise<Result<InvoiceDraft | null>>,
  saveDraft: (draft) =>
    ipcRenderer.invoke('draft:save', draft) as Promise<Result<InvoiceDraft>>,
  getSettings: () =>
    ipcRenderer.invoke('settings:get') as Promise<Result<Settings>>,
  saveSettings: (settings) =>
    ipcRenderer.invoke('settings:save', settings) as Promise<Result<Settings>>,
  setAppearance: (appearance) =>
    ipcRenderer.invoke('settings:set-appearance', appearance) as Promise<
      Result<Settings['appearance']>
    >,
  selectCsv: () =>
    ipcRenderer.invoke('settings:select-csv') as Promise<Result<string | null>>,
  selectArchiveFolder: () =>
    ipcRenderer.invoke('settings:select-archive') as Promise<
      Result<string | null>
    >,
  selectInvoiceLogo: () =>
    ipcRenderer.invoke('settings:select-logo') as Promise<
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
  issueInvoice: (input) =>
    ipcRenderer.invoke('invoice:issue', input) as Promise<
      Result<IssuedInvoice>
    >,
  listInvoices: () =>
    ipcRenderer.invoke('archive:list') as Promise<
      Result<InvoiceArchiveEntry[]>
    >,
  readInvoice: (id) =>
    ipcRenderer.invoke('archive:read', id) as Promise<Result<IssuedInvoice>>,
  openInvoicePdf: (id) =>
    ipcRenderer.invoke('archive:open-pdf', id) as Promise<Result<boolean>>,
  revealInvoicePdf: (id) =>
    ipcRenderer.invoke('archive:reveal-pdf', id) as Promise<Result<boolean>>,
};

contextBridge.exposeInMainWorld('invoicing', api);
