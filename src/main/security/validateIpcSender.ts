import { app, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTrustedSenderUrl } from './trustedSender';
export function validateIpcSender(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url;
  const rendererUrl = pathToFileURL(
    path.join(app.getAppPath(), 'out/renderer/index.html'),
  ).href;
  if (
    !senderUrl ||
    !isTrustedSenderUrl(
      senderUrl,
      process.env.ELECTRON_RENDERER_URL,
      rendererUrl,
    )
  )
    throw new Error('Unauthorized IPC sender.');
}
