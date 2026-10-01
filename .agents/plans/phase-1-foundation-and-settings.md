# Feature: Phase 1 Foundation and Settings

## Feature Description

Build the initial cross-platform Electron application foundation and a reliable local customer-data workflow. Phase 1 establishes project scaffolding, the first executable UI, shared domain types, secure IPC, settings persistence, and CSV-backed customer CRUD.

Invoice editing, calculations, live preview, PDF generation, and QR-bill generation remain Phase 2 and Phase 3 work.

## User Story

As a small-business owner, I want to configure my company details and manage customers from my existing CSV file so that I can maintain reliable local invoice data without manually editing application files.

## Problem Statement

The repository is currently documentation-only. There is no executable desktop shell, typed domain model, persistence layer, or safe way to manage a customer CSV while preserving user-owned data and detecting external edits.

## Solution Statement

Create an Electron application using TypeScript, React, Electron Vite, `zod`, and maintained CSV parser/serializer packages. Keep filesystem and persistence operations in the main process, expose narrow typed preload APIs, store application settings in Electron’s user-data directory, and treat the selected CSV as the customer source of truth. Preserve CSV structure and refuse writes when the source changed externally.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Electron shell, preload IPC, renderer settings/customer UI, shared domain types, settings persistence, CSV parsing and safe writes
**Dependencies**: Electron, Electron Vite, React, TypeScript, `zod`, `csv-parse`, `csv-stringify`, Vitest, ESLint, Prettier

## Context references

### Relevant codebase files

- `.agents/AGENTS.md` - Repository architecture, TypeScript conventions, Electron security rules, planned structure, and validation expectations.
- `.codex/PRD.md:295-320` - Phase 1 goal, scope, and validation requirements.
- `.agents/reference/electron.md` - Main/preload/renderer responsibilities, secure defaults, IPC, and cross-platform behavior.
- `.agents/reference/csv-data.md` - CSV preservation, dialect handling, fingerprint conflict detection, safe writes, and validation matrix.
- `.agents/reference/components.md` - Renderer component, form, accessibility, and appearance guidance.
- `.codex/README.md` - Repository documentation and skill workflow conventions.

### New files to create

```text
package.json
tsconfig.json
tsconfig.node.json
electron.vite.config.ts
eslint.config.js
.prettierrc

src/main/index.ts
src/main/ipc/registerHandlers.ts
src/main/ipc/settingsHandlers.ts
src/main/ipc/customerHandlers.ts
src/main/services/settingsStore.ts
src/main/services/customerCsvService.ts
src/main/services/fileDialogService.ts
src/main/security/validateIpcSender.ts

src/preload/index.ts
src/preload/api.ts

src/renderer/index.html
src/renderer/main.tsx
src/renderer/App.tsx
src/renderer/components/AppShell.tsx
src/renderer/components/SettingsForm.tsx
src/renderer/components/CustomerList.tsx
src/renderer/components/CustomerForm.tsx
src/renderer/components/ErrorMessage.tsx
src/renderer/hooks/useSettings.ts
src/renderer/hooks/useCustomers.ts
src/renderer/styles/global.css
src/renderer/styles/tokens.css

src/shared/domain/address.ts
src/shared/domain/companySettings.ts
src/shared/domain/customer.ts
src/shared/domain/invoice.ts
src/shared/domain/settings.ts
src/shared/ipc/contracts.ts
src/shared/validation/customerValidation.ts
src/shared/validation/settingsValidation.ts
src/shared/csv/dialect.ts
src/shared/csv/csvDocument.ts

tests/unit/customerValidation.test.ts
tests/unit/settingsValidation.test.ts
tests/unit/csvDocument.test.ts
tests/integration/customerCsvService.test.ts
tests/integration/settingsStore.test.ts
```

### Patterns to follow

- Use strict TypeScript, ES modules, named imports/exports, and framework-neutral shared modules.
- Keep privileged filesystem, native dialog, persistence, and CSV operations in `src/main`.
- Keep the preload API narrow and explicit; do not expose `ipcRenderer`, generic invoke/send helpers, arbitrary paths, or filesystem methods.
- Treat CSV, persisted JSON, IPC payloads, and third-party results as `unknown` until validated.
- Return structured, user-safe errors from main-process services. Do not expose raw stack traces or arbitrary filesystem details to the renderer.
- Preserve CSV headers, unknown columns, empty cells, delimiter, BOM, line endings, ordering, and text values.
- Record source identity and content hash after load; compare both before every write.
- Use temporary output and safe replacement so failed serialization or replacement cannot destroy the original CSV.
- Use native HTML semantics, visible focus, associated labels, and accessible validation messages in the renderer.

## Implementation plan

### Phase 1: Foundation

- Initialize npm project with Electron Vite, React, strict TypeScript, Vitest, ESLint, and Prettier.
- Configure main, preload, and renderer entrypoints.
- Enable context isolation, sandboxing, disabled renderer Node integration, local-only navigation, and restrictive CSP.
- Add shared domain, validation, CSV dialect, and IPC contract modules.

### Phase 2: Core implementation

- Implement JSON settings storage under Electron’s user-data directory, with defaults, schema validation, atomic replacement, and safe errors.
- Implement native CSV selection and archive-folder selection adapters.
- Implement CSV inspection, parsing, known-field mapping, metadata retention, source fingerprinting, conflict detection, and safe replacement.
- Implement customer list, search, create, edit, delete, reload, and conflict states.
- Implement settings controls for company identity, contact details, CSV path, archive path, currency, payment term, numbering, template, and appearance preference.

### Phase 3: Integration

- Register validated settings and customer IPC handlers.
- Connect preload methods to typed renderer hooks.
- Connect hooks to React components and renderer error/loading/empty states.
- Update the root README and `.agents/AGENTS.md` with actual scripts, dependency versions, and implemented structure.
- Save this plan at `.agents/plans/phase-1-foundation-and-settings.md`.

### Phase 4: Testing and validation

- Add unit coverage for settings, customer validation, dialect detection, parsing, serialization, and preservation.
- Add integration coverage for settings restart behavior, CSV CRUD, external-edit conflicts, safe writes, and IPC validation.
- Run typecheck, lint, formatting check, test suite, and production build.
- Perform manual launch and customer CSV workflows on macOS; document Windows-specific checks if packaging is not available on the development host.

## Step-by-step tasks

### CREATE project configuration

- **IMPLEMENT** `package.json`, TypeScript configs, Electron Vite config, ESLint, Prettier, and Vitest configuration.
- **IMPORTS** Pin compatible versions of Electron, React, `zod`, `csv-parse`, `csv-stringify`, Vitest, and build tooling.
- **GOTCHA** Keep renderer and main TypeScript configurations separate enough to prevent Node imports from entering renderer code.
- **VALIDATE** `npm install && npm run typecheck`

### CREATE shared domain and IPC contracts

- **IMPLEMENT** Address, company settings, customer, invoice placeholder, settings, CSV metadata, request/result, and structured error types.
- **PATTERN** Follow `.agents/AGENTS.md` strict typing and framework-neutral shared-module guidance.
- **GOTCHA** Store phone numbers, postal codes, IDs, and unknown CSV cells as text; do not define calculation policy in Phase 1.
- **VALIDATE** `npm run typecheck`

### CREATE secure Electron shell and preload

- **IMPLEMENT** Main window creation, secure `webPreferences`, local-content CSP, navigation restrictions, sender validation, and explicit preload methods.
- **PATTERN** Follow `.agents/reference/electron.md`.
- **GOTCHA** Never expose generic IPC or unrestricted filesystem access to the renderer.
- **VALIDATE** `npm run typecheck && npm run build`

### CREATE settings persistence

- **IMPLEMENT** Defaults, schema validation, load/save methods, user-data path resolution, temporary-file replacement, and structured errors.
- **GOTCHA** Invalid persisted data must be reported or safely replaced with defaults according to the documented policy; raw paths and stack traces must not cross IPC.
- **VALIDATE** `npm test -- settingsStore settingsValidation`

### CREATE CSV document model and parser/serializer

- **IMPLEMENT** Dialect inspection, BOM and line-ending retention, RFC-compatible record parsing, known-field mapping, unknown-column preservation, serialization, and malformed/ambiguous-input errors.
- **PATTERN** Follow `.agents/reference/csv-data.md`.
- **GOTCHA** Never parse by splitting lines or commas; never trim or normalize user-owned cell values implicitly.
- **VALIDATE** `npm test -- csvDocument`

### CREATE customer CSV service

- **IMPLEMENT** Load/select, fingerprint, CRUD, external-change comparison, conflict result, safe replacement, and reload operations.
- **GOTCHA** Refuse writes after an external edit and preserve the original file if any replacement step fails.
- **VALIDATE** `npm test -- customerCsvService`

### CREATE renderer settings and customer UI

- **IMPLEMENT** Accessible settings form, customer list/search, customer form, delete confirmation, loading/empty/error/conflict states, and typed hooks.
- **PATTERN** Follow `.agents/reference/components.md` and `.agents/AGENTS.md` renderer guidance.
- **GOTCHA** Keep values in editor state, associate labels with controls, and preserve unsaved form state across conflict reload prompts where practical.
- **VALIDATE** `npm run typecheck && npm run build`

### UPDATE documentation

- **IMPLEMENT** Add actual commands, dependency choices, source structure, and CSV behavior to `README.md` and `.agents/AGENTS.md`.
- **VALIDATE** `git diff --check`

## Testing strategy

### Unit tests

- Settings defaults, invalid data, schema errors, and serialization.
- Customer required fields, Unicode, blank values, phone numbers, postal codes, and leading zeroes.
- Comma, semicolon, and tab delimiters; UTF-8 with/without BOM; LF/CRLF; quoted commas/quotes/newlines; empty cells; unknown columns; optional final newline.
- Round-trip preservation of headers, ordering, unknown columns, values, delimiter, BOM, and line endings.
- Malformed rows and ambiguous dialects return actionable errors.

### Integration tests

- Settings survive a store reload.
- CSV load and CRUD preserve unrelated data.
- External content changes are detected before writes.
- Failed replacement leaves the original file intact.
- IPC rejects invalid payloads and unauthorized senders.

### Edge cases

- Missing, empty, read-only, locked, malformed, or non-UTF-8 files.
- Unicode names, quoted multiline values, leading-zero postal codes, plus-prefixed phone numbers, spaces in paths, and cancelled dialogs.
- Duplicate customer identifiers, missing mapped headers, ambiguous delimiter detection, and records with inconsistent field counts.

## Validation commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

## End-to-end and UI validation

### Test setup

1. Run `uname -s`; proceed only on macOS or Linux because `agent-browser` does not support native Windows.
2. Run `npm install`, `npm run dev`, and wait for the Electron window/dev frontend to be ready.
3. Create an isolated fixture directory outside the repository containing:
   - `customers.csv` with comma-delimited headers, an unknown column, an accented name, a quoted value containing a comma, and a leading-zero postal code.
   - `customers-semicolon.csv` with semicolon delimiters and CRLF line endings.
4. Start the app with the fixture paths unset so the first-run state is exercised.
5. Store screenshots under `e2e-screenshots/phase-1/`; after every navigation, form submission, modal, reload, or other dynamic UI update, take a screenshot and inspect it for clipping, overflow, missing labels, broken focus, and stale data.
6. After each journey, run `agent-browser console` and `agent-browser errors`; record any output with the screenshot path.

### Journey 1: First launch and settings persistence

1. Launch the app and capture `01-first-launch.png`.
2. Verify the empty/default state is understandable, the main heading is visible, and no uncaught console errors appear.
3. Open Settings and capture `02-settings-empty.png`.
4. Fill company name, structured address, phone, email, default currency, payment term, invoice prefix/year/sequence, template, and appearance preference.
5. Capture `03-settings-filled.png` before saving; confirm every field has a visible label and no horizontal overflow.
6. Save settings and capture `04-settings-saved.png`.
7. Close and relaunch the app. Capture `05-settings-restored.png`.
8. Verify every saved value is restored and that the persisted JSON contains no renderer-only or secret values.
9. Clear a required field, save, and capture `06-settings-validation-error.png`; verify the field is identified and focus can move to it with the keyboard.

### Journey 2: Select and load a customer CSV

1. From the customer screen, choose the CSV file through the native file picker and capture `01-csv-selected.png`.
2. Verify the customer list shows all valid records, preserves accents and leading zeroes, and does not display the unknown column as a mapped field.
3. Capture `02-customer-list-loaded.png` and inspect desktop layout, table alignment, empty-cell rendering, and row actions.
4. Reload the semicolon/CRLF fixture and capture `03-semicolon-csv-loaded.png`.
5. Verify the delimiter and line-ending dialect are retained when the file is later written.
6. Attempt to load a malformed fixture and capture `04-csv-parse-error.png`; verify the app keeps the previous valid data and gives an actionable error.

### Journey 3: Add and edit a customer

1. Click Add Customer and capture `01-customer-form-empty.png`.
2. Enter a customer with Unicode text, a structured address, a phone number beginning with `+`, an email address, and a postal code with leading zeroes.
3. Capture `02-customer-form-filled.png` and verify labels, focus indication, and responsive form layout.
4. Save and capture `03-customer-added.png`.
5. Confirm the new CSV record preserves all original rows, headers, unknown columns, delimiter, BOM, line endings, quoting, and exact text values.
6. Edit the new customer, change the city and phone, save, and capture `04-customer-edited.png`.
7. Confirm only the intended record changed and that the list reflects the edit without a full-app reload.
8. Submit the form with each required field blank and capture `05-customer-validation-error.png`; verify each error is associated with its control.

### Journey 4: Delete a customer

1. Select the fixture customer created for deletion and click Delete; capture `01-delete-confirmation.png`.
2. Cancel the confirmation and capture `02-delete-cancelled.png`; verify the row remains.
3. Repeat, confirm deletion, and capture `03-customer-deleted.png`.
4. Verify the row disappears, the CSV has one fewer record, unrelated rows and columns remain unchanged, and no duplicate or orphaned record is created.

### Journey 5: Detect an external CSV edit before save

1. Open an existing customer in edit mode and capture `01-edit-before-external-change.png`.
2. Modify the selected CSV externally by changing a different customer and adding a harmless unknown-column value.
3. Return to the app, save the open edit, and capture `02-conflict-detected.png`.
4. Verify the app refuses to overwrite the file, clearly identifies a reload/conflict state, and preserves the unsaved form values.
5. Choose Reload, capture `03-after-conflict-reload.png`, and verify the external change appears.
6. Reapply the intended edit and save; capture `04-conflict-resolved.png`.
7. Verify both the external change and the intended app change are present, with no lost columns or records.

### Journey 6: Safe failure and recovery

1. Make a copy of the fixture and arrange for the target file to be read-only or otherwise unwritable.
2. Attempt a customer edit and save; capture `01-write-failure.png`.
3. Verify an actionable error is shown and the original file content and metadata remain unchanged.
4. Restore write access, retry, and capture `02-write-recovered.png`.
5. Verify the retry succeeds without duplicate records or stale UI state.

### Responsive and accessibility pass

For the first-launch, settings, customer-list, customer-form, conflict, and write-error screens, repeat screenshots at:

- `375x812`: `responsive/mobile-*.png`
- `768x1024`: `responsive/tablet-*.png`
- `1440x900`: `responsive/desktop-*.png`

At each size, verify no clipped controls, horizontal scrolling, overlapping dialogs, or unusable touch targets. Exercise the complete settings and customer workflows with keyboard-only navigation and confirm visible focus, logical tab order, and readable error associations.

### Evidence and pass criteria

- Every listed screenshot exists and has been visually inspected.
- No journey leaves uncaught console errors or unhandled exceptions.
- UI state, CSV contents, and persisted settings agree after every mutation.
- Any failure is recorded with the journey, expected result, actual result, screenshot path, console/error output, and data-file diff.
- The E2E run is not considered passing until all journeys and viewport checks pass or each remaining issue is explicitly documented.

## Acceptance criteria

- [ ] Electron app launches in development mode.
- [ ] Renderer has no direct Node.js or filesystem access.
- [ ] Main/preload/renderer boundaries are secured and typed.
- [ ] Settings persist across restart and reject invalid stored data safely.
- [ ] User can select and reload a customer CSV.
- [ ] CSV round trips preserve supported dialect details and unknown data.
- [ ] Customer add, edit, and delete operations work through the UI.
- [ ] External CSV edits are detected before overwrite.
- [ ] Write failures leave the original CSV recoverable.
- [ ] Unit and integration tests cover the CSV preservation and conflict matrix.
- [ ] README and AGENTS guidance describe the actual commands and structure.

## Risks and mitigations

- **Dialect ambiguity:** require explicit selection instead of silently guessing.
- **Data loss during writes:** use fingerprints, temporary output, and safe replacement.
- **Electron privilege leakage:** keep filesystem operations in main and expose narrow preload methods.
- **Cross-platform paths:** use Node/Electron path APIs and test Unicode, spaces, missing files, permissions, and cancellation.
- **Future model changes:** keep invoice types framework-neutral and defer calculation policy to Phase 2.

**Confidence:** 8/10 for one-pass implementation once dependency versions are pinned and a representative customer CSV is available.
