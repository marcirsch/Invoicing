import { dialog, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
export async function selectArchiveFolder(
  window: BrowserWindow,
): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
}
export async function selectCsv(window: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
}
export async function createCsvPath(
  window: BrowserWindow,
): Promise<string | null> {
  const result = await dialog.showSaveDialog(window, {
    title: 'Create customer CSV',
    buttonLabel: 'Create CSV',
    defaultPath: 'customers.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return path.extname(result.filePath).toLocaleLowerCase() === '.csv'
    ? result.filePath
    : `${result.filePath}.csv`;
}
export async function selectInvoiceLogo(
  window: BrowserWindow,
): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  });
  const filePath = result.canceled ? null : (result.filePaths[0] ?? null);
  if (!filePath) return null;
  const fileInfo = await fs.stat(filePath);
  if (!fileInfo.isFile())
    throw new Error('Choose a valid PNG, JPEG, or WebP image file.');
  if (fileInfo.size === 0) throw new Error('The selected logo file is empty.');
  if (fileInfo.size > 1_500_000)
    throw new Error('The selected logo must be smaller than 1.5 MB.');
  const bytes = await fs.readFile(filePath);
  const extension = filePath.toLowerCase().split('.').pop();
  const signatures: Record<string, { mime: string; valid: boolean }> = {
    png: {
      mime: 'image/png',
      valid: bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    },
    jpg: {
      mime: 'image/jpeg',
      valid:
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff,
    },
    jpeg: {
      mime: 'image/jpeg',
      valid:
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff,
    },
    webp: {
      mime: 'image/webp',
      valid:
        bytes.toString('ascii', 0, 4) === 'RIFF' &&
        bytes.toString('ascii', 8, 12) === 'WEBP',
    },
  };
  const signature = extension ? signatures[extension] : undefined;
  if (!signature || !signature.valid)
    throw new Error('Choose a valid PNG, JPEG, or WebP image file.');
  const mime = signature.mime;
  return `data:${mime};base64,${bytes.toString('base64')}`;
}
