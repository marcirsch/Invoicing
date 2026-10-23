import { app, BrowserWindow, nativeTheme, session } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHandlers } from './ipc/registerHandlers';
import { SettingsStore } from './services/settingsStore';
import { CustomerCsvService } from './services/customerCsvService';
import { DraftStore } from './services/draftStore';
import { InvoiceArchiveStore } from './services/invoiceArchiveStore';
import { InvoiceIssuanceService } from './services/invoiceIssuanceService';
import { renderInvoicePdf } from './services/invoicePdfService';

const smokeTestMode = process.argv.includes('--smoke-test');
const smokeUserDataPath = process.argv
  .find((argument) => argument.startsWith('--smoke-user-data-path='))
  ?.slice('--smoke-user-data-path='.length);
const smokeResultPath = process.argv
  .find((argument) => argument.startsWith('--smoke-result-path='))
  ?.slice('--smoke-result-path='.length);

if (squirrelStartup) app.quit();
if (process.platform === 'win32')
  app.setAppUserModelId('com.squirrel.LocalInvoicing.LocalInvoicing');

function createWindow(): void {
  const rendererFile = pathToFileURL(
    path.join(__dirname, '../renderer/index.html'),
  ).href;
  const devOrigin = process.env.ELECTRON_RENDERER_URL
    ? new URL(process.env.ELECTRON_RENDERER_URL).origin
    : null;
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  if (smokeTestMode) {
    win.webContents.once('did-finish-load', () => {
      void win.webContents
        .executeJavaScript(
          "Boolean(window.invoicing && typeof window.invoicing.getSettings === 'function' && typeof window.invoicing.loadCustomers === 'function')",
        )
        .then((bridgeAvailable: boolean) => {
          finishSmokeTest(
            bridgeAvailable
              ? 'SMOKE_TEST_OK'
              : 'SMOKE_TEST_FAIL: preload bridge missing',
            bridgeAvailable,
          );
        })
        .catch(() => {
          finishSmokeTest(
            'SMOKE_TEST_FAIL: renderer did not initialize',
            false,
          );
        });
    });
  }
  if (process.env.ELECTRON_RENDERER_URL)
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (devOrigin ? new URL(url).origin !== devOrigin : url !== rendererFile)
      event.preventDefault();
  });
}
app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) =>
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.ELECTRON_RENDERER_URL
            ? "default-src 'self'; script-src 'self' http://127.0.0.1:* http://localhost:* 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' http://127.0.0.1:* http://localhost:*; connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*; img-src 'self' data:"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        ],
      },
    }),
  );
  const testUserDataPath =
    process.env.INVOICING_TEST_USER_DATA_PATH?.trim() ||
    (smokeTestMode ? smokeUserDataPath : undefined);
  const userDataPath = testUserDataPath
    ? path.resolve(testUserDataPath)
    : app.getPath('userData');
  if (testUserDataPath) app.setPath('userData', userDataPath);
  const store = new SettingsStore(userDataPath);
  void store.load().then((settings) => {
    nativeTheme.themeSource = settings.appearance;
  });
  const drafts = new DraftStore(userDataPath);
  const archive = new InvoiceArchiveStore(userDataPath);
  const rendererUrl =
    process.env.ELECTRON_RENDERER_URL ??
    pathToFileURL(path.join(__dirname, '../renderer/index.html')).href;
  const issuance = new InvoiceIssuanceService(
    store,
    drafts,
    archive,
    (invoice) => renderInvoicePdf(rendererUrl, invoice),
  );
  registerHandlers(store, new CustomerCsvService(), drafts, archive, issuance);
  createWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function finishSmokeTest(message: string, success: boolean): void {
  if (smokeResultPath) {
    void writeFile(smokeResultPath, message, 'utf8').then(() =>
      app.exit(success ? 0 : 1),
    );
    return;
  }
  process.stdout.write(`${message}\n`, () => app.exit(success ? 0 : 1));
}
