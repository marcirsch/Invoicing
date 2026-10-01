# Electron Cross-Platform App Guidelines

Use this guide for Electron main/preload/renderer code, filesystem access, OS integration, appearance handling, or desktop packaging.

## Process responsibilities

- Keep privileged work in the main process: filesystem access, CSV and local persistence, PDF creation/assembly, native dialogs, and app lifecycle.
- Keep the renderer focused on UI and invoice state. It must not import Node.js modules or call Electron APIs directly.
- Expose a small, typed preload API for specific actions. Never expose ipcRenderer, generic send/invoke helpers, arbitrary paths, or unrestricted filesystem operations.
- Validate IPC payloads and sender frames in the main process. Return structured, user-safe errors.
- Prefer request/response IPC for file selection, customer loading, and PDF generation. Use events only for genuine main-to-renderer notifications.
- Share invoice types and calculations through framework-neutral modules. Revalidate critical issue-time data outside the UI.

## Secure defaults

- Enable context isolation and renderer sandboxing; disable renderer Node integration.
- Load packaged local application content and define a restrictive Content Security Policy. Do not run remote scripts or remote HTML in the privileged renderer.
- Keep web security enabled. Restrict navigation and new-window creation to app routes; handle external links with an allowlist.
- Validate sender identity and payload schemas for every privileged IPC operation. Expose one constrained preload method per allowed operation.
- Use native file/folder dialogs for CSV and archive selection. Treat CSV text, logos, and invoice/customer values as untrusted; never interpret user data as HTML.
- Use a current supported Electron release and review dependency maintenance and security before adoption or upgrade.

## Cross-platform behavior

- Use Electron/Node path APIs; do not hard-code path separators or assume Desktop/Documents locations. Persist user-selected paths and handle moved or unavailable files.
- Treat dialog cancellation, permission denial, read-only/locked CSVs, and archive write failures as recoverable UI states.
- Test macOS and Windows separately: fresh install, launch/quit, native dialogs, Unicode and spaces in paths, permissions, CSV replacement, PDF saving, and app-data persistence.
- Keep platform-specific behavior behind small adapters so OS lifecycle or menu differences do not enter invoice logic.
- Implement System/Light/Dark through Electron native theme support. System follows OS changes; Light/Dark are persistent overrides until returned to System.
- App appearance must not change the invoice paper or exported PDF theme.

## Validation checklist

Before shipping, confirm Electron security preferences, CSP, navigation limits, and IPC validation. Exercise valid, invalid, cancelled, missing, and denied file operations. Verify launch/reopen, theme behavior, and packaged builds on both operating systems.

## References

- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron Process Sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Electron Inter-Process Communication](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron nativeTheme API](https://www.electronjs.org/docs/latest/api/native-theme)
- [Electron webContents API](https://www.electronjs.org/docs/latest/api/web-contents)
