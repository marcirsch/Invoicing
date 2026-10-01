import { contextBridge, ipcRenderer } from 'electron';
export const api = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('settings:save', s),
  loadCustomers: (p: string) => ipcRenderer.invoke('customers:load', p),
  listCustomers: () => ipcRenderer.invoke('customers:list'),
  saveCustomer: (c: unknown) => ipcRenderer.invoke('customers:save', c),
  deleteCustomer: (id: string) => ipcRenderer.invoke('customers:delete', id),
};
contextBridge.exposeInMainWorld('invoicing', api);
