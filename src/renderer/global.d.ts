import type { IpcApi } from '../shared/ipc/contracts';
declare global {
  interface Window {
    invoicing: IpcApi;
  }
}
export {};
