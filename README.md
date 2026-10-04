# Local Invoicing App

This repository contains the product plan and implementation guidance for a local desktop invoicing app for a small Swiss service business.

The planned app will run on macOS and Windows. It will let users manage customers in a human-readable CSV file, prepare German-language invoices, preview multi-page output, and archive generated PDFs with a Swiss QR-bill as the final page.

## Current status

Phase 1 foundation and settings plus initial Phase 2 draft editing are implemented: invoice drafts use decimal-safe line calculations, date-only dates, local autosave/restore, customer selection, and a fixed-light on-screen preview. Invoice issuance, PDF archival, and Swiss QR-bill generation remain Phase 3.

## Planned technology

- Electron and TypeScript for the desktop application
- HTML and CSS for the invoice preview and invoice PDF pages
- `swissqrbill` and PDFKit for Swiss QR-bill generation
- Local application storage for settings, the active draft, and issued-invoice metadata
- `decimal.js` for exact draft calculations (each line rounded half-up to cents before summing)
- A user-selected CSV file as the customer source of truth

## Phase 1

Phase 1 establishes the desktop foundation and local data workflow:

- Secure Electron main, preload, and renderer boundaries
- Typed company, customer, invoice, and settings models
- Local settings persistence
- Customer CSV selection, parsing, validation, preservation of unknown columns, and external-edit conflict detection
- Customer list and create, edit, and delete workflows

## Phase 2 draft workspace

The app provides one editable invoice draft with customer and company snapshots, date and currency controls, stable-ID service rows, a suggested number that does not advance settings, debounced local persistence, and a screen preview. Draft dates use `YYYY-MM-DD`; due dates use calendar-day arithmetic. The `classic` and `simple` choices currently share an early preview layout. Full page pagination and preview-to-editor keyboard navigation are not implemented yet. The preview is not a PDF and contains no QR-bill.

Phase 3 will add validated issuance, immutable snapshots, PDF archival, and a compliant Swiss QR-bill. Draft data is stored separately in `invoice-draft.json`; malformed saved data is retained and reported instead of silently replaced.

## Documentation

- [Product requirements](.codex/PRD.md)
- [Repository guidance](.agents/AGENTS.md)
- [Customer CSV guidance](.agents/reference/csv-data.md)
- [Electron guidance](.agents/reference/electron.md)
- [Invoice domain guidance](.agents/reference/invoice-domain.md)
- [Preview and PDF guidance](.agents/reference/pdf-preview.md)
- [Renderer and accessibility guidance](.agents/reference/components.md)

## Development

This section assumes you are starting with a fresh checkout and have not used Node.js or Electron before.

### 1. Install prerequisites

Install the current LTS version of [Node.js](https://nodejs.org/). The installer includes `npm`, the package manager used by this project.

After installation, open a new Terminal (macOS/Linux) or PowerShell (Windows) and confirm that both commands work:

```bash
node --version
npm --version
```

Any recent Node.js LTS release should work. If either command is not found, restart the terminal after installing Node.js.

### 2. Open the repository

Clone the repository, or open the directory you already downloaded:

```bash
cd /path/to/Invoicing
```

Replace `/path/to/Invoicing` with the actual location on your computer. You can check that you are in the right directory with:

```bash
ls
```

You should see `package.json` and the `src` directory.

### 3. Install project dependencies

Run this once after cloning the repository:

```bash
npm install
```

This reads `package.json`, downloads Electron, React, TypeScript, and the other required packages, and creates the local `node_modules` directory. The directory is generated locally and is not part of the source code.

If the dependencies have already been installed, you can skip this step unless `package.json` or `package-lock.json` changed.

### 4. Start the app in development mode

```bash
npm run dev
```

This starts Electron Vite and opens the desktop application. Keep this terminal window open while using the app. When you edit a source file, the development process rebuilds the relevant part of the app.

Stop the development app with `Ctrl+C` in the terminal.

### 5. Run the checks

Run these commands from the repository directory after making changes:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run smoke
```

They check TypeScript types, report code-quality issues, and run the automated tests. A command that finishes successfully exits without an error status.

`npm run format:check` checks whether files follow the repository’s Prettier formatting rules. To format the source files automatically, run:

```bash
npm run format
```

Review the resulting changes before committing them.

### 6. Create and smoke-test a production build

```bash
npm run build
npm run smoke
```

`npm run build` compiles the main process, preload script, and renderer into the generated `out` directory. `npm run smoke` builds the app, launches that production output, and verifies the renderer and preload bridge initialize. It does not create an installer yet. A successful result ends with:

```text
Smoke test passed: Electron loaded the renderer and preload bridge.
```

If this command fails, copy the complete terminal output when reporting the problem. It identifies whether dependency installation, compilation, Electron startup, or preload initialization failed.

### 7. Typical day-to-day workflow

After the initial setup, the usual workflow is:

```bash
cd /path/to/Invoicing
npm run dev
```

After editing code, stop the app and run the checks:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run smoke
```

### Troubleshooting

- **`node` or `npm` is not recognized:** install Node.js LTS and restart your terminal.
- **`npm install` fails:** confirm your internet connection, then retry from the repository directory. Do not delete source files; `node_modules` can be regenerated by running `npm install` again.
- **`Electron uninstall` or `Electron failed to install correctly`:** Electron’s desktop runtime was not downloaded. From the repository directory, run `node node_modules/electron/install.js`, then retry `npm run dev`.
- **The app does not open:** check the terminal output first. Stop the process with `Ctrl+C`, run `npm install` again, and retry `npm run dev`. Use `npm run smoke` to check the production launch and preload bridge.
- **A port is already in use:** close another development process for this repository, then run `npm run dev` again.
- **TypeScript or lint errors appear after editing:** read the file and line number shown in the command output, fix the source, and rerun the command.

Filesystem and native dialogs stay in `src/main`; the renderer receives only narrow preload APIs. Customer CSV loading retains delimiter, line endings, BOM, headers, unknown columns, and text values, and refuses writes after an external content change.
