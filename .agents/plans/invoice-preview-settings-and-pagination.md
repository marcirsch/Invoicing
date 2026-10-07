# Feature: Complete Invoice Settings, Live Preview, and Page Layout

This plan replaces the first-pass fixes with a coherent settings, draft, and preview flow. Before implementing, read the linked repository guidance and keep the editable draft as the source of truth for the preview.

## Feature Description

Complete the invoice-preparation experience so a user can choose a company logo, maintain the company information used on the invoice, see saved company changes reflected in the active draft preview, configure an invoice footer, and review invoices across A4 pages without clipping. Also polish the requested row action, table spacing, due-date behavior, and customer selection label.

The preview must reflect the actual rendered content rather than an assumed fixed number of service rows per page. Screen preview and future Chromium PDF output must use the same invoice markup, page model, page dimensions, and footer placement. Existing customer CSV files continue to store one complete customer name in the `name` field; no CSV migration is in scope.

## User Story

As a small-business owner preparing an invoice,
I want my saved company identity, logo, payment details, footer, customer, dates, and service rows to appear correctly across all invoice pages,
so that I can review a complete, legible invoice before issuing it.

## Problem Statement

The current invoice workspace is an early preview, and the first implementation of these fixes does not yet provide a reliable end-to-end behavior:

- The selected logo is encoded into settings, but `invoiceDraftSchema` currently places `logoDataUrl` on the customer schema and omits it from the company schema. Draft persistence can therefore strip or reject company logo data.
- Preview pages are split every eight rows regardless of row wrapping or available page height. A long description or larger company/customer block can overflow or clip even when there are fewer than eight rows.
- Company details are copied into a draft snapshot. Settings changes need a deliberate synchronization rule for the active editable draft; changing settings must not mutate any future issued snapshot.
- The settings model does not yet include every company detail called for by the PRD and sample invoice, including website, IBAN, and bank name.
- The due-date update currently runs whenever the invoice date changes, with no representation of whether the user intentionally overrode the due date.
- The customer model already stores a complete customer name in one field, and the dropdown displays it. Preserve this single-field CSV contract.

The label and table/button spacing changes are small UI refinements and should remain scoped to the invoice editor.

## Solution Statement

Extend and validate the company settings model for the invoice identity shown in the sample: company/legal name, structured address, phone, email, website, IBAN, bank name, and an optional selected logo. Select image files through a constrained main-process dialog, validate the type and size, and store a bounded data URL in settings and the active draft's sender snapshot. Migrate existing settings and drafts with safe defaults.

On settings save, update the sender and configured invoice footer in the active editable draft and let its existing debounced save persist them. Render all configured sender fields in the preview. Issued records are not part of this task; later issuance must snapshot the values at issue time.

Add a distinct multiline invoice footer setting. Reserve footer space on every invoice page and render the configured footer there. Keep draft-specific closing notes separate and on the final invoice page, matching the sample's separation between closing text and recurring legal/payment footer notes.

Represent due-date behavior explicitly: new drafts begin in automatic mode; changing invoice date or the configured payment term recomputes due date while automatic. Editing the due date switches the draft to manual mode and preserves the override. Add a clearly labeled reset-to-payment-term action to return to automatic mode. Keep dates as ISO date-only strings and use the existing calendar-day helper.

Replace fixed eight-row chunking with a page-layout function driven by actual rendered dimensions at the invoice's A4 content width. Measure row and section heights after fonts and logo decoding, place rows while respecting reserved header/footer/total space, repeat a compact invoice heading on continuation pages, and never silently clip content. Use the same page model/markup for screen preview and print styles. Allow a single unusually tall row or paragraph to flow when it cannot fit intact on a fresh page. Recalculate page breaks after changes to data, template, width, font/image load, or text scaling.

## Feature Metadata

**Feature Type**: Enhancement / Bug Fix
**Estimated Complexity**: High
**Primary Systems Affected**: Company/settings domain and validation; settings persistence and logo IPC; invoice draft model, validation, hook, and autosave; settings and invoice renderer components; A4 preview layout and print CSS; unit/integration tests and documentation.
**Dependencies**: Existing Electron 44, React 18, TypeScript 5, Zod, Vitest, and browser layout APIs. No new runtime dependency is proposed.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `.agents/AGENTS.md:18-91` - Product state, process boundaries, company/customer/invoice rules, security, naming, and validation conventions.
- `.codex/PRD.md:48-60` - Stated MVP features for company settings, logo, templates, footer, and multi-page preview.
- `.codex/PRD.md:83-96` - User stories for company details/logo and customer selection.
- `.codex/PRD.md:100-117` - Process split and company-settings field expectations.
- `.codex/PRD.md:138-168` - Shared preview/print layout, synchronization, page breaks, templates, and logo support requirements.
- `.codex/PRD.md:178-190` - Settings and issued invoice snapshot requirements.
- `.codex/PRD.md:263-280` - Acceptance behavior for multi-page layout and settings synchronization.
- `.agents/reference/components.md:1-38` - Accessible form/table patterns, stable row IDs, and preview behavior.
- `.agents/reference/pdf-preview.md:1-40` - Shared invoice model/template, A4 pagination, footer placement, print, and visual verification.
- `.agents/reference/electron.md:1-50` - Main/preload/renderer boundary, IPC validation, dialogs, and cross-platform behavior.
- `.agents/reference/invoice-domain.md:1-44` - Draft snapshots, date-only handling, settings defaults, and invoice-domain boundaries.
- `src/shared/domain/companySettings.ts:1-8` - Current sender fields; extend here for website, payment details, and logo data.
- `src/shared/domain/settings.ts:1-14` and `src/shared/domain/settingsDefaults.ts:1-26` - Settings shape and defaults; payment term currently defaults to 30 days.
- `src/shared/validation/settingsValidation.ts:1-52` - Settings input schema and actionable validation pattern; preserve compatibility with settings files written before the new fields.
- `src/shared/domain/invoice.ts:1-29` - Draft, sender snapshot, and date fields; add explicit automatic/manual due-date state here.
- `src/shared/validation/invoiceValidation.ts:1-52` - Draft and persisted-snapshot validation. Fix sender logo schema placement and default optional newly introduced draft fields when reading old drafts.
- `src/shared/invoice/dates.ts` - Existing ISO date validation and calendar-day addition.
- `src/renderer/hooks/useInvoiceDraft.ts:10-102` - Default draft construction, initialization, debounced autosave, due-date updates, settings synchronization, and add-row behavior.
- `src/renderer/components/SettingsForm.tsx:5-275` - Current settings controls, validation mapping, footer control, and logo selection display.
- `src/renderer/App.tsx:17-107` - Settings persistence, logo selection callback, renderer navigation, and draft integration.
- `src/renderer/components/InvoiceWorkspace.tsx:9-328` - Customer selector, row action, date controls, current page splitting, invoice sender/customer display, and footer rendering.
- `src/renderer/styles/global.css:171-242` - Current table, add-row gap, footer, logo, and compact row styles.
- `src/renderer/styles/global.css:319-435` - Workspace grid, invoice paper geometry, footer placement, and print page rules.
- `src/main/services/fileDialogService.ts:1-38` - Native CSV/archive/logo dialog pattern and current base64 conversion.
- `src/main/ipc/settingsHandlers.ts:14-57` - Settings and logo handler registration pattern; operations receive a validated application window.
- `src/main/ipc/registerHandlers.ts:15-83` - Common IPC sender validation, safe errors, and draft validation boundaries.
- `src/preload/api.ts` and `src/shared/ipc/contracts.ts` - Narrow typed preload methods and `Result<T>` contracts.
- `src/main/services/settingsStore.ts:1-70` - Settings JSON read/write and Windows-safe atomic replacement.
- `tests/unit/settingsValidation.test.ts` and `tests/integration/settingsStore.test.ts` - Zod and backwards-compatible persistence test patterns.
- `tests/unit/invoiceValidation.test.ts` and `tests/integration/draftStore.test.ts` - Draft validation and versioned draft persistence patterns.
- `tests/unit/dates.test.ts` - Date-only calendar arithmetic tests.
- `package.json` - Current validation scripts: typecheck, lint, formatting, unit/integration tests, build, and Electron smoke test.
- `example_invoice.pdf` - One-page A4 reference. It shows the logo and sender block at top, the recipient beside it, invoice metadata, service table, total/closing text, and a lower payment/VAT footer note.

### New Files to Create

- `src/renderer/components/invoice/InvoicePreview.tsx` - Focused preview page/template component if page rendering is split from the editor workspace.
- `src/renderer/invoice/measureInvoicePages.ts` - Renderer-only measurement and page assignment logic if it cannot remain a small cohesive module beside the preview. Keep browser DOM measurement out of `src/shared`.
- `tests/unit/invoicePageLayout.test.ts` - Tests for the pure row-to-page assignment decisions, reserved space, and continuation/final-page rules.
- `tests/integration/settingsMigration.test.ts` - Only if migration behavior is not covered by the existing settings store tests.

Do not create these files if equivalent focused modules already exist after implementation inspection. Keep renderer measurement APIs out of main-process/shared domain modules.

### Relevant Documentation YOU SHOULD READ BEFORE IMPLEMENTING

- [Electron `webContents.printToPDF`](https://www.electronjs.org/docs/latest/api/web-contents/#contentsprinttopdfoptions)
  - Align the print page size, margins, background, and CSS page sizing; wait for assets before printing.
- [W3C CSS Fragmentation Module Level 3](https://www.w3.org/TR/css-break-3/)
  - `break-before`, `break-after`, `break-inside`, `orphans`, and `widows`; browser break choices are not fully deterministic, so verify rendered output.
- [CSS Paged Media guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media)
  - Screen/print page geometry, margins, headers, and footers.
- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)
  - Keep image file access and validation in the main process; expose only the constrained picker through preload.
- [React `useLayoutEffect`](https://react.dev/reference/react/useLayoutEffect)
  - Use only where synchronous post-layout measurement is required; avoid unnecessary measurement loops and layout thrashing.

### Patterns to Follow

**Naming and types:** Use `CompanySettings`, `InvoiceDraft`, `Settings`, and `Customer`. Keep type-only imports explicit and use lower camel case for helpers. Preserve `Customer.name` as the complete display name; do not split or migrate the CSV.

**Settings migration:** `SettingsStore.load()` currently parses with `settingsBaseSchema` and falls back to defaults for invalid data. New fields must use safe schema defaults so an older otherwise-valid settings file retains its existing values. Add migration tests so adding company fields never silently resets a user's settings.

**Draft synchronization:** Only update the active draft's sender/footer when saved settings change. Keep draft editor values (customer, rows, dates, notes) intact. Ensure the synchronization effect does not loop and that an already loaded old draft receives current saved defaults once.

**Logo boundary:** Keep native file reading in `src/main/services/fileDialogService.ts`, expose one specific `selectInvoiceLogo()` method through preload, and continue validating the IPC sender. Restrict file extensions, verify content signatures, cap bytes before base64 encoding, and use a safe user-facing error. On cancellation, preserve the current logo. Keep supported image data local/offline and validate both settings and draft schema fields.

**Due date:** Keep `YYYY-MM-DD` and `addCalendarDays`. Add persisted `dueDateMode: 'automatic' | 'manual'` (default old drafts to automatic). Update due date for invoice-date/payment-term changes only in automatic mode; manual edits switch mode to manual. Add an explicit reset action that recomputes from invoice date and current configured term.

**Pagination:** Use actual rendered row heights at the A4 content width rather than a constant row count. Measure only after fonts and logos are ready. Keep each normal row together, allow oversized text/rows to flow without clipping, repeat column headers and a concise invoice identity on continuation pages, and reserve total/notes/footer space where they belong. Recompute when page width, template, text, sender/customer, logo, or app zoom changes. Use stable line IDs so layout recalculation does not change identity.

**Footer:** Keep `invoiceFooter` distinct from draft `notes`. Display the configured footer in the reserved footer area on every invoice page; retain the sample's closing/payment note content as separate invoice notes unless product requirements are revised.

**Errors and accessibility:** Return `Result<T>` IPC failures with safe, actionable messages. Keep form labels and focus indicators. The customer dropdown's option text remains `customer.name` (the full name already in the CSV/model).

---

## IMPLEMENTATION PLAN

### Phase 1: Domain and backwards-compatible persistence

- Extend company settings with website, IBAN, bank name, and optional logo data, and extend settings with a distinct invoice footer.
- Add schema defaults for new settings fields and validate bounded local logo data.
- Add explicit automatic/manual due-date state to drafts; old drafts migrate to automatic mode and get the configured footer/company values.
- Correct the draft sender schema to validate the logo on `sender`, not on `customer`.

### Phase 2: Settings, logo selection, and draft synchronization

- Add controls for all supported sender fields, footer text, and logo selection/preview in settings.
- Keep selection in the main process, preserve the logo on cancellation, show safe errors, and update saved settings after selection.
- On settings save, refresh the active draft's sender and recurring footer while preserving all other draft edits.
- Render all configured sender details (including logo, website, IBAN, and bank) in the invoice sender block.

### Phase 3: Date and editor refinements

- Implement automatic/manual due-date transitions and reset-to-payment-term action.
- Keep the configured payment term default at 30 days unless existing settings have another value.
- Keep the customer selector using the complete `Customer.name`; refine its accessible label if needed without changing CSV structure.
- Keep the action text “Add row” and scoped spacing below the service table.

### Phase 4: Content-aware page preview and print behavior

- Extract preview page rendering from the editor if that keeps components focused.
- Replace the fixed eight-row chunk with a browser-measured page layout at A4 width; account for first/continuation header, customer/metadata blocks, table headings, totals, notes, and footer reservation.
- Preserve long content through wrapping/fragmentation and do not clip when a line cannot fit intact.
- Align the screen page shells with print `@page`, A4 size, margins, and explicit break rules; use identical template markup for both built-in templates.
- Recalculate when data, fonts, image loading, template, viewport, or text scaling changes.

### Phase 5: Tests, documentation, and visual verification

- Add migrations, IPC/logo validation, due-date-mode, and page-layout unit/integration tests.
- Update README and repository guidance so implemented logo/footer and pagination behavior and remaining PDF/QR phase boundaries are accurate.
- Run typecheck, lint, format check, tests, build, and smoke test; visually inspect one- and multi-page invoices and print/PDF output on desktop-sized and narrow layouts.

---

## STEP-BY-STEP TASKS

Execute these tasks in order. Each task should leave the application type-correct before proceeding.

### Task 1: UPDATE `src/shared/domain/companySettings.ts`, `settings.ts`, `settingsDefaults.ts`, and `invoice.ts`

- **IMPLEMENT**: Add company `website`, `iban`, `bankName`, and optional `logoDataUrl`; add required settings `invoiceFooter`; add `dueDateMode: 'automatic' | 'manual'` to `InvoiceDraft`. Keep sender snapshots typed as `CompanySettings` and customer names as one full `name` string.
- **PATTERN**: Existing domain interfaces in those files; PRD company settings at `.codex/PRD.md:112` and sample fields in `example_invoice.pdf`.
- **IMPORTS**: No new dependencies.
- **GOTCHA**: Keep `invoiceFooter` separate from `InvoiceDraft.notes`; do not add first/last customer fields or alter CSV columns.
- **VALIDATE**: `npm run typecheck`.

### Task 2: UPDATE `src/shared/validation/settingsValidation.ts` and `invoiceValidation.ts`

- **IMPLEMENT**: Add bounded validation/defaults for new settings, company, logo, invoice footer, and due-date mode. Move `logoDataUrl` schema validation out of customer and into company/sender. Permit old valid settings/drafts to parse by defaulting new fields; reject oversized or malformed logo payloads and unknown due-date states.
- **PATTERN**: Current Zod schemas and `SettingsStore.load()` at `src/main/services/settingsStore.ts:10-25`; persisted draft wrapper at `src/shared/validation/invoiceValidation.ts:48-52`.
- **IMPORTS**: Existing Zod import and domain types where already used.
- **GOTCHA**: Do not let a missing newly introduced setting cause `SettingsStore.load()` to discard all previous company, CSV, numbering, or appearance values. Preserve the versioned draft envelope or explicitly migrate it.
- **VALIDATE**: `npm run typecheck` and `npm test -- tests/unit/settingsValidation.test.ts tests/unit/invoiceValidation.test.ts`.

### Task 3: ADD migration and due-date unit coverage

- **IMPLEMENT**: Test old settings with no added company/footer fields, old drafts with no logo/footer/mode, malformed/oversized logo values, and automatic/manual due-date transitions across month/year/leap-day boundaries.
- **PATTERN**: `tests/unit/settingsValidation.test.ts`, `tests/unit/invoiceValidation.test.ts`, and `tests/unit/dates.test.ts`.
- **IMPORTS**: Existing Vitest and schema/domain utilities; do not add React testing dependencies solely for these data behaviors.
- **GOTCHA**: A manually edited due date must stay unchanged when invoice date or settings payment term later change; Reset must restore automatic calculation.
- **VALIDATE**: `npm test -- tests/unit/settingsValidation.test.ts tests/unit/invoiceValidation.test.ts tests/unit/dates.test.ts`.

### Task 4: UPDATE logo selection in `fileDialogService.ts`, `settingsHandlers.ts`, `contracts.ts`, and `preload/api.ts`

- **IMPLEMENT**: Keep a constrained native image picker, supported PNG/JPEG/WebP types, verified file signatures and byte-size ceiling, base64 encoding only after validation, IPC sender validation, safe error mapping, and typed cancellation result. Persist the selected logo in company settings. Cancellation leaves the old logo untouched.
- **PATTERN**: `selectCsv` and `selectArchiveFolder` at `src/main/services/fileDialogService.ts:3-16`; `settings:select-logo` handler pattern at `src/main/ipc/settingsHandlers.ts:45-56`; contracts/preload methods for existing dialogs.
- **IMPORTS**: Node `fs/promises` already used by dialog service; image signature helpers can use Node buffers without a new package.
- **GOTCHA**: Do not expose arbitrary file paths or a generic file-reading IPC call. Reject misleading extensions/content mismatches and return a user-safe error through `registerHandlers`.
- **VALIDATE**: `npm run typecheck`, `npm run lint`, and `npm test -- tests/integration/ipcValidation.test.ts` (extend handler validation cases for the new operation where the test harness supports it).

### Task 5: UPDATE settings UI and active draft synchronization

- **IMPLEMENT**: Add website, IBAN, and bank name controls; retain the footer text control and logo chooser/thumbnail; render validation errors and handle chooser failure/cancellation. When valid settings are saved, update only the active draft's sender snapshot and recurring footer, preserve lines/customer/date/notes, and let existing autosave persist it.
- **PATTERN**: `SettingsForm` field helper and save validation at `src/renderer/components/SettingsForm.tsx:27-92`; settings handlers in `src/renderer/App.tsx:35-64`; `useInvoiceDraft` initialization/autosave at `src/renderer/hooks/useInvoiceDraft.ts:10-58`.
- **IMPORTS**: Existing `Settings`, `CompanySettings`, and `window.invoicing` types.
- **GOTCHA**: Ensure a loaded old draft is synchronized once after settings load; avoid a React effect loop and avoid replacing other draft fields. Do not claim an issued snapshot exists in this phase.
- **VALIDATE**: `npm run typecheck`, `npm run lint`, and `npm run format:check`.

### Task 6: UPDATE due-date behavior in `useInvoiceDraft.ts` and `InvoiceWorkspace.tsx`

- **IMPLEMENT**: New drafts use automatic mode. Invoice date/payment-term changes recalculate due date only in automatic mode; a due-date edit changes mode to manual. Add a “Use payment term”/equivalent reset button that recalculates the due date and returns to automatic mode.
- **PATTERN**: `addCalendarDays` use at `src/renderer/hooks/useInvoiceDraft.ts:10-18` and date inputs at `src/renderer/components/InvoiceWorkspace.tsx:67-83`.
- **IMPORTS**: Existing `addCalendarDays`; keep date-only strings.
- **GOTCHA**: A blank/intermediate date input must not crash date math or overwrite a manual due date. Define behavior for an invalid/incomplete invoice date (defer recalculation until a valid ISO date is entered).
- **VALIDATE**: `npm run typecheck` and `npm test -- tests/unit/dates.test.ts tests/unit/invoiceValidation.test.ts`.

### Task 7: UPDATE the customer option and service-row UI

- **IMPLEMENT**: Keep dropdown option text equal to the full existing `customer.name`; set an explicit accessible label. Keep the visible action text “Add row” and retain a scoped, measured gap below the table at normal and narrow widths.
- **PATTERN**: `Customer` uses one `name` field (`src/shared/domain/customer.ts:1-8`) and option rendering at `src/renderer/components/InvoiceWorkspace.tsx:44-61`; line table and button at lines 112-220; scoped row CSS in `src/renderer/styles/global.css:171-242`.
- **IMPORTS**: No new dependencies or customer schema changes.
- **GOTCHA**: Do not split or rewrite existing CSV names. Keep customer-list table styling untouched.
- **VALIDATE**: `npm run typecheck`, `npm run lint`, and manual selection of names containing spaces, accents, and hyphens.

### Task 8: CREATE/UPDATE content-aware invoice preview layout

- **IMPLEMENT**: Replace fixed `Math.ceil(lines.length / 8)` pagination with page assignment based on actual row/section heights at the A4 content width. Render a first-page sender/recipient/metadata header and compact repeated identity/table headings on continuation pages. Reserve totals/notes for the final page and footer space on each page. Re-measure after logo/font load, draft/template changes, viewport changes, and text zoom. Preserve stable row IDs. Ensure a row/paragraph larger than a page can flow and is not hidden by `overflow: hidden`.
- **PATTERN**: `InvoiceWorkspace` preview and fixed split at `src/renderer/components/InvoiceWorkspace.tsx:29-33,222-320`; A4 shell/print styles at `src/renderer/styles/global.css:335-435`; requirements in `.agents/reference/pdf-preview.md:5-20`.
- **IMPORTS**: React layout hooks/`ResizeObserver` and browser measurements only. Use a pure page-assignment function if possible so split decisions can be unit-tested without mounting React.
- **GOTCHA**: Avoid an assumed rows-per-page limit, measurement loops that read/write layout repeatedly, duplicate or omitted line IDs, clipped tall rows, detached totals, and footer overlap. Use the W3C break rules as hints, but visually test Chromium because allowed breaks alone do not guarantee one chosen page break.
- **VALIDATE**: `npm run typecheck`, `npm run lint`, `npm test -- tests/unit/invoicePageLayout.test.ts`, then manual visual inspection of one-page and multi-page previews with short/tall descriptions.

### Task 9: UPDATE invoice paper and print CSS

- **IMPLEMENT**: Define A4 page geometry/margins once using `@page` and align any Electron `printToPDF` options with it. Apply explicit page breaks between generated preview pages, avoid breaking ordinary rows, allow oversized text to continue, reserve a recurring footer zone, repeat table headings, and keep invoice styles independent of app theme. Render all configured sender fields and the selected logo using the same component for classic and simple templates.
- **PATTERN**: Existing `.invoice-paper`, `.invoice-footer`, `.invoice-pages`, and `@media print` rules in `src/renderer/styles/global.css:335-435`; template class in `InvoiceWorkspace.tsx`.
- **IMPORTS**: CSS only unless PDF generation is connected in a later phase.
- **GOTCHA**: `@media print` and screen pages must agree on usable height; never place footer over table content. If print export is not implemented in this feature, record the exact future `printToPDF` option values beside the service integration plan rather than adding a fake PDF flow.
- **VALIDATE**: `npm run format:check`, visual preview at normal/narrow widths, and—when a print/PDF path is available—`npm run build` followed by page count, text, and visual checks.

### Task 10: UPDATE tests and documentation

- **IMPLEMENT**: Add page layout tests for exact-fit, overflow-to-next-page, tall/wrapped row, empty invoice, continuation page, last-page total/notes, repeated footer, and recalculation after changed measured heights. Extend settings/draft persistence and IPC tests. Update README/AGENTS only where they currently say logo/footer/pagination are absent or incomplete.
- **PATTERN**: Existing `tests/unit` and `tests/integration` organization and Vitest; documentation style in `README.md` and `.agents/AGENTS.md`.
- **IMPORTS**: No new test dependencies unless an existing limitation is documented and approved as part of implementation.
- **GOTCHA**: Do not present the QR-bill, PDF archival, or issuance flow as implemented by this preview/settings task. The current PRD schedules those for Phase 3.
- **VALIDATE**: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, and `npm run smoke`.

---

## TESTING STRATEGY

### Unit Tests

- Settings defaults/migration preserve existing values when website, IBAN, bank name, logo, and footer are absent.
- Settings/draft schemas accept valid data URIs and reject unsupported, over-limit, malformed, or misplaced logo data.
- Due-date helper/state transitions cover automatic date changes, manual override preservation, reset, payment-term changes, month/year rollover, leap dates, and invalid/incomplete inputs.
- Page assignment covers a single page, exact capacity, next-page overflow, measured-height variation from long descriptions, row taller than a page, empty lines, continuation pages, final totals/notes, and footer reservation.

### Integration Tests

- Settings store loads old JSON without resetting profile, CSV path, archive path, numbering, appearance, or currency; it persists new fields and logo.
- Draft store loads older version-1 drafts with defaults for new footer and due-date mode, and round-trips sender logo/details.
- IPC logo chooser validates sender, returns cancellation safely, rejects invalid/oversized files, and persists valid supported images through the constrained settings operation.
- Saving settings while a draft is loaded updates sender/footer and autosaves without changing customer, rows, dates, currency, or notes.

### Manual Visual/Accessibility Checks

- Select/cancel/change a logo; confirm it survives restart and appears in settings and the invoice preview. Check transparent PNG and wide/tall images.
- Change each sender setting and save; verify preview updates without resetting invoice edits.
- Check the footer in settings and on every preview page; confirm notes remain separate and the footer does not overlap content.
- Change invoice date with automatic due date, manually override due date, change invoice date/payment term, then reset to the configured term.
- Select customers with multiword, accented, and hyphenated names; verify the complete name is visible.
- Confirm “Add row” and table spacing in the editor.
- Inspect both templates with short invoices, enough rows to require at least two pages, long descriptions, high font scaling, logo on/off, footer on/off, and a narrow window. No row, total, note, sender, or footer may be clipped or overlap.
- If Chromium PDF export exists by implementation time, compare page count and page breaks against the on-screen preview and inspect each rendered A4 page.

### Edge Cases

- Legacy settings and legacy saved draft with none of the new fields.
- Logo dialog canceled; invalid extension/signature; extension/content mismatch; empty file; at/over size limit; corrupt image; unsupported SVG.
- Settings changed while invoice draft is still loading; settings save racing with a pending autosave.
- User edits due date manually, then changes invoice date/payment term; user returns to automatic mode.
- Invoice date typed as an incomplete/invalid date; date crosses month/year/leap day.
- No customer selected; long customer/company names and email/website wrap.
- Zero rows; a row wraps to multiple lines; one row is taller than available page content; totals/notes fit only on a new final page; content grows after image or font load.
- Zoom/resizing changes available page width and row heights; recalculation must not flicker indefinitely or move focus unexpectedly.
- Dark app theme must not recolor white invoice paper.

---

## VALIDATION COMMANDS

Run from repository root:

### Level 1: Types, lint, and formatting

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

### Level 2: Unit and integration tests

- Focused while developing: `npm test -- tests/unit/settingsValidation.test.ts tests/unit/invoiceValidation.test.ts tests/unit/dates.test.ts tests/unit/invoicePageLayout.test.ts tests/integration/settingsStore.test.ts tests/integration/draftStore.test.ts tests/integration/ipcValidation.test.ts`
- Full suite before handoff: `npm test`

### Level 3: Build and startup

- `npm run build`
- `npm run smoke`

### Level 4: Manual layout and behavior

- Run `npm run dev`; visit Settings and Invoice at a 1200px desktop window and a narrower window.
- Exercise settings-to-preview synchronization, logo flow, footer, automatic/manual due-date flow, full customer names, and the “Add row” spacing.
- Generate representative previews with varied text/rows; inspect every page at 100% and larger OS/UI text settings for overflow/clipping.
- If PDF export is available, render every output page to images and compare its A4 breaks, footer, image load, and text against the live preview.

---

## ACCEPTANCE CRITERIA

- [ ] User can select a supported local logo in Settings; cancellation keeps the existing selection, and valid selection survives app restart.
- [ ] Logo data is bounded and schema-validated on settings and draft persistence; company sender schema retains it after load/save.
- [ ] All configured sender fields (name, structured address, phone, email, website, IBAN, bank name, logo) appear in the preview and update after settings save without resetting other draft content.
- [ ] A separate footer setting appears on every invoice page; draft notes remain distinct and appear in the appropriate closing area.
- [ ] Existing settings and drafts load with safe defaults without losing previously stored user settings or draft data.
- [ ] Invoice date changes update the due date while automatic; a manual due-date override persists until the user explicitly resets it to the configured term.
- [ ] The payment-term default remains 30 days for new installations and existing custom values are retained.
- [ ] Customer dropdown displays the complete existing `customer.name`; CSV structure is unchanged.
- [ ] The service-row action says “Add row”; measured spacing separates the service table and action at supported window sizes.
- [ ] Preview page breaks respond to actual rendered content, not a fixed row count; no invoice content is clipped, overlapped, duplicated, or omitted.
- [ ] Continuation pages identify the invoice and repeat table context; totals and notes remain associated with final-page content; the configured footer remains in its reserved area.
- [ ] Screen and print use shared invoice markup, A4 dimensions, and page-break rules; templates remain independent of app appearance.
- [ ] Typecheck, lint, formatting, full tests, build, smoke test, and documented visual checks pass.
- [ ] Phase 3 issuance, archive, and real Swiss QR-bill generation are not represented as completed unless separately implemented.

---

## COMPLETION CHECKLIST

- [ ] Existing settings/draft data migrates safely.
- [ ] Company settings, validated logo selection, active draft sync, and preview rendering are integrated.
- [ ] Automatic/manual due dates and reset behavior work.
- [ ] Customer dropdown and service-row UI match the confirmed single-name-field requirement.
- [ ] Content-aware multi-page layout works for both templates, including long content.
- [ ] Footer, totals, notes, and continuation headers are visually verified.
- [ ] All validation commands and manual scenarios are complete.
- [ ] README and repository guidance accurately describe delivered behavior and Phase 3 limits.

## NOTES

- The user confirmed that the customer CSV/model should retain one full-name field. Do not introduce separate first/last columns.
- The product PRD expects website, IBAN, and bank name as company information; the current settings UI/model does not yet store these. Include them so the preview can represent the sample invoice and the existing “company details” requirement.
- Use the W3C fragmentation properties as constraints, not as a guarantee of an exact browser break choice. The plan requires actual Chromium visual checks.
- Current page sizing by eight rows is only a prototype and is not an acceptable final pagination algorithm.
- Current logo flow has a schema placement defect: `logoDataUrl` is present under the persisted customer schema rather than the company sender schema. Fix before relying on logo persistence.
- **Confidence score: 8/10.** The UI, settings, persistence, and domain boundaries are known. The primary risk is stable, content-aware pagination across on-screen layout and Chromium print; build the measured-page prototype early and keep the first-page/continuation-page rules explicit.
