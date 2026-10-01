import { dialog, BrowserWindow } from 'electron';
export async function selectCsv(window: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
}
