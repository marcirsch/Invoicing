import { BrowserWindow } from 'electron';
import type { IssuedInvoice } from '../../shared/domain/issuedInvoice';

/** Prints the local renderer's print-only invoice route in a sandboxed Chromium window. */
export async function renderInvoicePdf(
  rendererUrl: string,
  invoice: IssuedInvoice,
): Promise<Uint8Array> {
  const url = new URL(rendererUrl);
  url.searchParams.set('printInvoice', '1');
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  try {
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, destination) => {
      if (new URL(destination).origin !== url.origin) event.preventDefault();
    });
    await window.loadURL(url.toString());
    await window.webContents.executeJavaScript(
      `(async () => { const deadline = Date.now() + 15000; while (typeof window.__setPrintInvoice !== 'function' && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25)); if (typeof window.__setPrintInvoice !== 'function') throw new Error('Invoice print route did not initialize.'); return true; })()`,
    );
    await window.webContents.executeJavaScript(
      `window.__setPrintInvoice(${JSON.stringify(JSON.stringify(invoice))})`,
    );
    await window.webContents.executeJavaScript(
      `(async () => { if (!document.querySelector('.invoice-paper')) await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Invoice print view did not render.')), 15000); const observer = new MutationObserver(() => { if (document.querySelector('.invoice-paper')) { clearTimeout(timer); observer.disconnect(); resolve(true); } }); observer.observe(document.body, { childList: true, subtree: true }); }); await document.fonts.ready; await Promise.all(Array.from(document.images, image => image.decode().catch(() => undefined))); return true; })()`,
    );
    const pdf = await window.webContents.printToPDF({
      pageSize: 'A4',
      landscape: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });
    if (!pdf.byteLength)
      throw new Error('Invoice PDF rendering returned an empty document.');
    return pdf;
  } finally {
    window.destroy();
  }
}
