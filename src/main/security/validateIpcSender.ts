import type { IpcMainInvokeEvent } from 'electron';
export function validateIpcSender(event: IpcMainInvokeEvent): void {
  if (
    !event.senderFrame.url.startsWith('file://') &&
    !event.senderFrame.url.startsWith('http://localhost')
  )
    throw new Error('Unauthorized IPC sender.');
}
