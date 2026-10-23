import { BrowserWindow, nativeTheme } from 'electron';
import type { CsvDelimiter } from '../../shared/csv/dialect';
import type { Settings } from '../../shared/domain/settings';
import {
  settingsBaseSchema,
  settingsSchema,
} from '../../shared/validation/settingsValidation';
import {
  selectArchiveFolder,
  selectCsv,
  selectInvoiceLogo,
} from '../services/fileDialogService';
import type { SettingsStore } from '../services/settingsStore';
import type { HandlerRegistrar } from './registerHandlers';

type CsvLoader = (path: string, delimiter?: CsvDelimiter) => Promise<unknown>;
export function registerSettingsHandlers(
  register: HandlerRegistrar,
  store: SettingsStore,
  loadCsv: CsvLoader,
  setPendingPath: (path: string | null) => void,
): void {
  register('settings:get', async () => store.load());
  register('settings:save', async (_event, payload) => {
    const settings = settingsSchema.parse(payload) as Settings;
    const saved = await store.save(settings);
    nativeTheme.themeSource = saved.appearance;
    return saved;
  });
  register('settings:set-appearance', async (_event, payload) => {
    const appearance = settingsBaseSchema.shape.appearance.parse(payload);
    const current = await store.load();
    const saved = await store.savePreferences({ ...current, appearance });
    nativeTheme.themeSource = saved.appearance;
    return saved.appearance;
  });
  register('settings:select-csv', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) throw new Error('The application window is unavailable.');
    const filePath = await selectCsv(window);
    if (!filePath) return null;
    setPendingPath(filePath);
    await loadCsv(filePath);
    return filePath;
  });
  register('settings:select-archive', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) throw new Error('The application window is unavailable.');
    const folderPath = await selectArchiveFolder(window);
    if (!folderPath) return null;
    const settings = await store.load();
    await store.savePreferences({ ...settings, archivePath: folderPath });
    return folderPath;
  });
  register('settings:select-logo', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) throw new Error('The application window is unavailable.');
    const logoDataUrl = await selectInvoiceLogo(window);
    if (!logoDataUrl) return null;
    const settings = await store.load();
    await store.savePreferences({
      ...settings,
      company: { ...settings.company, logoDataUrl },
    });
    return logoDataUrl;
  });
}
