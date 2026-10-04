import { app, BrowserWindow, nativeTheme, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHandlers } from './ipc/registerHandlers';
import { SettingsStore } from './services/settingsStore';
import { CustomerCsvService } from './services/customerCsvService';
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
  if (process.argv.includes('--smoke-test')) {
    win.webContents.once('did-finish-load', () => {
      void win.webContents
        .executeJavaScript(
          "Boolean(window.invoicing && typeof window.invoicing.getSettings === 'function' && typeof window.invoicing.loadCustomers === 'function')",
        )
        .then((bridgeAvailable: boolean) => {
          console.log(
            bridgeAvailable
              ? 'SMOKE_TEST_OK'
              : 'SMOKE_TEST_FAIL: preload bridge missing',
          );
          app.exit(bridgeAvailable ? 0 : 1);
        })
        .catch(() => {
          console.error('SMOKE_TEST_FAIL: renderer did not initialize');
          app.exit(1);
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
  const store = new SettingsStore(app.getPath('userData'));
  void store.load().then((settings) => {
    nativeTheme.themeSource = settings.appearance;
  });
  registerHandlers(store, new CustomerCsvService());
  createWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
