# Feature: Phase 2 Invoice Editor and Live Preview

This plan implements the Phase 2 scope in `.codex/PRD.md` on top of the current Phase 1 app. Keep implementation within the existing Electron main/preload/renderer boundaries and shared TypeScript domain. Do not implement invoice issuance, PDF archive writing, or Swiss QR-bill generation; those remain Phase 3.

## Feature Description

Add the editable invoice draft workspace: select a customer, edit service rows and dates, calculate amounts safely, preview one or more A4 pages in either of two invoice templates, navigate from preview fields to their editor controls, and autosave/restore the single active draft. The app appearance preference already exists in settings and CSS; retain and verify the System/Light/Dark behavior while ensuring invoice paper always uses its own fixed template colors.

The current `Invoice` interface is only a three-field skeleton. The implementation must define a complete, validated draft model before building the UI. The current project has no invoice math dependency or draft persistence service.

## User Story

As a small-business owner, I want to prepare an invoice from my customer list, edit its service rows, and review a saved multi-page preview, so that I can complete and check a draft before issuing it.

## Problem Statement

Phase 1 provides settings and CSV-backed customer management, but there is no invoice workspace or durable invoice draft. Users cannot assemble customer and company details, enter service quantities and rates, see reliable totals, or check how a long invoice will paginate before the later issue/PDF phase.

## Solution Statement

Create a typed invoice draft as the sole source of truth for editor, calculations, and preview. Put date-only and decimal-safe arithmetic in shared deterministic modules; validate draft persistence at the main-process boundary; expose only narrow draft and logo-selection IPC operations; and compose the existing customer/settings workflows into an accessible editor and clickable A4 preview. Keep issuance-only state (committed number, immutable issued snapshot, PDF and QR payload) out of this phase.

Agreed product rules for this plan:

- Round each line amount to currency cents, using decimal arithmetic, then sum the rounded line amounts.
- Resolve exact half-cent ties with round-half-up.
- Treat `paymentTermDays` as calendar days.
- Store invoice and due dates as ISO date-only strings (`YYYY-MM-DD`); do not use timestamps for calendar-date arithmetic.
- Show the configured next-number suggestion in the draft without consuming or advancing it. Final assignment and issue-time override validation remain Phase 3 responsibilities.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Shared invoice domain/validation/calculation; main-process draft persistence and logo dialog; preload IPC; renderer navigation, editor, preview, appearance; automated tests and project documentation.
**Dependencies**: Existing Electron 44, React 18, TypeScript 5, Zod, and Vitest stack. Add an arbitrary-precision decimal dependency (proposed: `decimal.js`) only after checking its current release and package metadata. Do not add a PDF or QR library in Phase 2.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `.codex/PRD.md` lines 143–169 - Invoice workspace, appearance, preview and template requirements; lines 194–211 - proposed stack and PDF boundary; lines 310–319 - Phase 2 goals and validation.
- `.agents/AGENTS.md` lines 18–85 - architecture, Electron security, naming, domain, and data/UI requirements.
- `.agents/reference/invoice-domain.md` - canonical invoice model, money and date constraints. The product choices left open in this guide are resolved above for this feature.
- `.agents/reference/components.md` - accessible inputs and stable-ID preview-to-editor mapping.
- `.agents/reference/pdf-preview.md` lines 5–20 and 30–39 - shared model/template, A4 pagination, and visual verification. The PDF generation material is future phase context only.
- `src/shared/domain/invoice.ts` lines 1–5 - existing placeholder to replace with the complete draft model.
- `src/shared/domain/customer.ts` and `src/shared/domain/address.ts` - customer and structured-address shapes to reuse.
- `src/shared/domain/settings.ts`, `settingsDefaults.ts`, and `src/shared/validation/settingsValidation.ts` - available settings, defaults, validation, and the existing System/Light/Dark values.
- `src/main/services/settingsStore.ts` lines 10–59 - local JSON persistence, defaults, validation, and platform-safe atomic-write pattern. Draft data must use its own file and schema; do not overwrite settings.
- `src/main/ipc/registerHandlers.ts` lines 40–82, `src/main/ipc/settingsHandlers.ts`, and `src/main/ipc/customerHandlers.ts` - validated IPC registration and service integration patterns.
- `src/preload/api.ts` and `src/shared/ipc/contracts.ts` - narrow typed bridge and serializable `Result<T>` contract.
- `src/renderer/App.tsx` lines 1–107 - current navigation, customer/settings hooks, and appearance application.
- `src/renderer/hooks/useSettings.ts`, `src/renderer/hooks/useCustomers.ts` - asynchronous state, loading/saving/error patterns.
- `src/renderer/components/AppShell.tsx` lines 1–44 - existing app navigation to extend with an invoice workspace.
- `src/renderer/components/SettingsForm.tsx` and `src/renderer/styles/tokens.css` - settings controls and theme tokens to extend rather than replace.
- `tests/unit/settingsValidation.test.ts`, `tests/unit/customerValidation.test.ts`, `tests/integration/settingsStore.test.ts`, and `tests/integration/ipcValidation.test.ts` - Zod, temp-directory persistence, and IPC security test patterns.
- `.agents/plans/phase-1-foundation-and-settings.md` lines 312–340 - phase 1 acceptance/validation record and known manual-validation limits.

### New Files to Create

- `src/shared/domain/invoice.ts` - complete draft, line-item, sender/recipient snapshot, and style-selection types.
- `src/shared/validation/invoiceValidation.ts` - Zod draft schema with field-safe validation.
- `src/shared/invoice/money.ts` - pure decimal line and invoice calculations with explicit policy.
- `src/shared/invoice/dates.ts` - ISO date-only validation and calendar-day due-date calculation.
- `src/main/services/draftStore.ts` - load, save, and clear-or-replace current draft in user data.
- `src/main/services/logoDialogService.ts` or an extension to `fileDialogService.ts` - constrained native image selection (follow existing dialog organization).
- `src/main/ipc/draftHandlers.ts` - validated load/save draft and logo selection operations.
- `src/renderer/hooks/useInvoiceDraft.ts` - draft state, initialization, debounced autosave, and recoverable error handling.
- `src/renderer/components/InvoiceWorkspace.tsx`, `InvoiceEditor.tsx`, and focused customer/date/line-item subcomponents under `src/renderer/components/invoice/`.
- Template components/styles under `src/renderer/components/invoice/templates/` for sample recreation and simpler alternate.
- `src/renderer/components/invoice/InvoicePreview.tsx` and preview field/focus mapping helpers.
- `tests/unit/invoiceValidation.test.ts`, `tests/unit/money.test.ts`, `tests/unit/dates.test.ts`, and `tests/integration/draftStore.test.ts` plus draft IPC cases in the existing IPC test file.

Update existing files listed above as needed; keep component and file names aligned with established PascalCase React component filenames and lowerCamelCase utility filenames.

### Relevant Documentation YOU SHOULD READ BEFORE IMPLEMENTING

- [Electron `webContents` API](https://www.electronjs.org/docs/latest/api/web-contents#contentsprinttopdfoptions) - Later PDF phase reference; Phase 2 preview should share print CSS, but must not invoke PDF issuance.
- [Electron `dialog` API](https://www.electronjs.org/docs/latest/api/dialog) - Main-process native logo selection.
- [React documentation: Managing State](https://react.dev/learn/managing-state) - Keep draft state explicit and avoid duplicating derived totals.
- [decimal.js project documentation](https://github.com/MikeMcl/decimal.js/) - Proposed decimal arithmetic API and explicit rounding configuration. Confirm current package release, license, TypeScript declarations, and bundler compatibility before adding it.
- [MDN CSS paged media](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_paged_media) and [CSS fragmentation](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fragmentation) - A4 page geometry and row/page-break behavior.
- [WAI-ARIA Authoring Practices: Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) - Keyboard activation for preview targets.

### Patterns to Follow

**Naming and imports:** `lowerCamelCase` for functions/utilities, `UpperCamelCase` for interfaces/components. Use named exports and `import type` for type-only imports. Keep domain utilities independent of React and Electron.

**Error boundaries:** IPC operations return the existing `Result<T>` shape. Validate renderer payloads in main before persistence, translate failures to safe messages in `registerHandlers`, and do not expose raw filesystem paths or exception text.

**Persistence:** Follow `SettingsStore` for a versioned schema boundary and atomic replacement, but use a separate draft JSON file. Initialize a blank draft only when no valid saved draft exists; a corrupt draft must produce a recoverable error and must not be silently overwritten with defaults.

**React state:** Follow the hooks' loading/saving/error pattern. Store user-entered decimal values as strings so blank or partially typed values are preserved. Derive all line amounts and totals from those strings and never store formatted display text as calculation input.

**Preview mapping:** Give each editable invoice field a stable field identifier and each row a stable UUID. Map row identity plus field key to editor refs, not array indexes. Use semantic buttons with an accessible name and Enter/Space activation; after activation scroll and focus the control.

**Appearance:** Extend the existing CSS token system and settings. System follows native preference; Light/Dark remain persistent overrides. Invoice paper has fixed template styles and white/print-safe backgrounds independent of app appearance.

**Money:** Parse decimal input strings directly into the selected decimal library, calculate a row exactly, then round to two decimal places using `ROUND_HALF_UP`, and sum the rounded rows. Configure precision intentionally and enforce sensible maximum input lengths/ranges so the library cannot receive unbounded values. Use `Intl.NumberFormat('de-CH', { currency, style: 'currency' })` only for display.

**Date arithmetic:** Parse and validate `YYYY-MM-DD` as a real calendar date. Add calendar days using UTC date components (or an equivalent date-only utility), never local-midnight timestamps that shift across time zones.

**Pagination decision:** First build a small renderer spike with representative short/long rows and compare a CSS page-wrapper preview against a paginated continuous document. Reuse one invoice template and data mapper for screen and future print. Choose the simplest approach that shows stable A4 page boundaries, allows click targets, and handles long descriptions and rows crossing pages. Record the decision in code comments or this plan's implementation notes; do not maintain separate visual designs for preview and future PDF.

**QR-page boundary:** Phase 2 does not generate a QR payload or scannable QR graphic. Where a full-invoice preview is needed, show a clearly marked, non-scannable payment-page preview/placeholder based on the current payment/company/customer data; replace it with the real standards-compliant QR-bill in Phase 3. Keep this page visually separate from the invoice template.

---

## IMPLEMENTATION PLAN

### Phase 1: Domain and persistence foundation

- Expand invoice and line-item types; define explicit draft ownership of the selected customer/sender data and template options.
- Implement runtime schemas and pure money/date utilities, with the agreed rounding and calendar-day rules.
- Add isolated local draft persistence and narrow typed IPC methods. Add tests before connecting UI.

### Phase 2: Editor and calculations

- Add invoice navigation and a new-invoice/current-draft workspace.
- Support customer selection, safe customer replacement behavior, invoice/due dates, suggested number, currency, editable line-item rows, and derived totals.
- Persist editor changes with debounced autosave and restore on launch.

### Phase 3: Templates and live preview

- Implement the supplied-sample recreation and a simpler alternate from the same model.
- Implement screen A4 page preview/pagination, optional preview-only payment page, and stable preview-to-editor field focus.
- Add minimal invoice styling/section controls required by the PRD and logo selection only if it can be done through a constrained native dialog and validated local image handling.

### Phase 4: Integration, accessibility, and validation

- Integrate appearance modes with existing settings and theme tokens; prove invoice pages do not inherit dark app colors.
- Exercise short/long invoices, insert/remove row focus mappings, persistence recovery, and keyboard-only operation.
- Run repository typecheck/lint/format/tests/build/smoke commands and update README/AGENTS guidance to reflect Phase 2 capabilities and remaining Phase 3 boundary.

---

## STEP-BY-STEP TASKS

### Task 1: UPDATE `src/shared/domain/invoice.ts` and ADD `src/shared/invoice/money.ts`, `dates.ts`

- **IMPLEMENT**: Define draft ID, date-only invoice/due dates, currency, suggested invoice number, selected customer snapshot/reference, sender snapshot, line items with stable IDs and text inputs for hours/rate, and selected template/options. Define pure date and calculation interfaces.
- **PATTERN**: Domain interfaces in `src/shared/domain/customer.ts` and `companySettings.ts`; existing placeholder at `src/shared/domain/invoice.ts:1`.
- **IMPORTS**: Proposed decimal library only in `money.ts`; avoid bringing it into components or serialized domain types.
- **GOTCHA**: No JavaScript `number` arithmetic for money; keep incomplete form text representable. Calculate each row rounded to cents half-up, then add the row-cent values. Preserve exact row input strings. Handle invalid date strings and leap dates. Freeze invoice number suggestion from prefix/year/sequence for this draft without changing settings.
- **VALIDATE**: `npm run typecheck` and `npm test`.

### Task 2: ADD `src/shared/validation/invoiceValidation.ts` and domain tests

- **IMPLEMENT**: Add Zod schemas for persisted draft, nested snapshots, line items, IDs, currency, ISO date values, and style options. Distinguish a valid saved draft from an incomplete in-progress draft; reject non-finite/out-of-range numeric text only when a calculation/issue boundary requires it, while preserving blank editor fields.
- **PATTERN**: `src/shared/validation/settingsValidation.ts`; tests in `tests/unit/settingsValidation.test.ts` and `tests/unit/customerValidation.test.ts`.
- **IMPORTS**: `zod`, shared domain interfaces, money/date functions.
- **GOTCHA**: Validation errors must map to actionable field paths. A draft is allowed to be unfinished and cannot be held to Phase 3 issue requirements.
- **VALIDATE**: `npm run typecheck` and `npm test`.

### Task 3: ADD `src/main/services/draftStore.ts` and `tests/integration/draftStore.test.ts`

- **IMPLEMENT**: Load and atomically save a single current draft under Electron's user-data directory. Use a version marker, schema-check every load/save, safe temp-file replacement on Windows/macOS, and explicit recoverable handling for malformed data. Debounce belongs in the renderer, not the store.
- **PATTERN**: `src/main/services/settingsStore.ts:10-59` and temp-directory lifecycle in `tests/integration/settingsStore.test.ts:1-22`.
- **IMPORTS**: `node:fs/promises`, `node:path`, invoice schema/types.
- **GOTCHA**: Do not modify `settings.json` or reset a corrupt draft silently. Ensure concurrent rapid saves are serialized or last-write-safe.
- **VALIDATE**: `npm run typecheck` and `npm test`.

### Task 4: UPDATE IPC contract and ADD draft handlers; extend `tests/integration/ipcValidation.test.ts`

- **IMPLEMENT**: Add `loadDraft`/`saveDraft`/`clearDraft` only if a reset action is included, plus any constrained logo selection operation. Register methods through existing handler registration and preload. Validate every payload in main and return safe `Result<T>` failures.
- **PATTERN**: `src/shared/ipc/contracts.ts:4-19`, `src/preload/api.ts`, `src/main/ipc/registerHandlers.ts:40-82`, `src/main/ipc/customerHandlers.ts:38-41`.
- **IMPORTS**: `invoiceValidation.ts`, `DraftStore`, Zod, typed IPC contracts.
- **GOTCHA**: Do not expose paths or generic IPC helpers to the renderer. Logo selection must be a native, main-process dialog with image-only filters and bounded/validated content. Do not broaden trusted sender rules.
- **VALIDATE**: `npm run typecheck` and `npm test`.

### Task 5: CREATE the `useInvoiceDraft` hook and editor components

- **IMPLEMENT**: Add invoice navigation and the main editor, customer selector, date fields, line-item table, add/remove row actions, currency display, line/total calculation, loading/error states, and debounced autosave. Restore an existing draft, otherwise initialize a new draft from current settings and customers. Preserve data when changing customers; require an explicit replace action if replacement would discard entered rows/details.
- **PATTERN**: `src/renderer/hooks/useSettings.ts`, `useCustomers.ts`, form validation/error focus in `src/renderer/components/SettingsForm.tsx`, and main navigation in `AppShell.tsx`.
- **IMPORTS**: shared invoice/date/money modules, customer/settings types, typed `window.invoicing` methods.
- **GOTCHA**: Do not autosave a blank initialization over an unreadable draft. Use stable row IDs; do not key row controls by index. Never mutate a saved/issued concept; Phase 2 only has a working draft. Keep derived amounts out of persisted input fields or recompute them from canonical input strings.
- **VALIDATE**: `npm run typecheck` and `npm test`.

### Task 6: CREATE the two invoice templates and paginated preview

- **IMPLEMENT**: Recreate the sample design and add a clearly distinct simpler template; render sender/customer blocks, invoice/date fields, service rows, totals, notes, and template-specific sections from the same draft model. Define A4 aspect/print CSS, page boundaries, break handling, row continuation, and long-description behavior. Add a preview-only non-scannable payment-page placeholder if product flow presents the complete invoice at this stage.
- **PATTERN**: `.agents/reference/pdf-preview.md:5-20` and existing app tokens in `src/renderer/styles/tokens.css`.
- **IMPORTS**: invoice domain types and pure formatters only; no settings or filesystem access inside template components.
- **GOTCHA**: Preview and future PDF must share invoice markup/data mapping. App dark mode cannot darken paper. Do not claim a placeholder QR is scannable or generate a Phase 3 payload here. Add template key validation and backward-compatible defaulting for an absent template option.
- **VALIDATE**: `npm run typecheck` and `npm run lint`; manually inspect short and long representative drafts.

### Task 7: ADD stable preview-to-editor field navigation

- **IMPLEMENT**: Provide keyboard-operable preview targets for editable sender/customer/date/description/quantity/rate fields. Resolve targets by stable domain field ID and row ID, scroll to editor field, focus it, and make focus visible. Totals and payment graphic/placeholder are display-only.
- **PATTERN**: `.agents/reference/components.md:22-27`.
- **IMPORTS**: React refs and the preview field mapping types.
- **GOTCHA**: Verify mappings after adding, deleting, and reordering rows and for fields flowing to subsequent pages. Accessible names should identify line-item row and field.
- **VALIDATE**: `npm run typecheck` and `npm run lint`; manually check keyboard activation and resulting focus.

### Task 8: UPDATE appearance/settings and supported invoice styling controls

- **IMPLEMENT**: Reuse existing appearance preference and `nativeTheme` behavior; make the workspace honor System/Light/Dark. Add only the settings/style fields required to select the two templates and PRD-supported optional section/color/logo controls, with safe defaults and backward-compatible settings parsing. If logo selection is deferred, note it explicitly and do not render arbitrary local file URLs.
- **PATTERN**: `src/shared/domain/settings.ts`, `settingsDefaults.ts`, `settingsValidation.ts`, `src/main/ipc/settingsHandlers.ts:16-21`, `App.tsx` theme effect, and `tokens.css:21-49`.
- **IMPORTS**: Zod settings schema; native dialog through a narrow IPC call if logo remains in scope.
- **GOTCHA**: Invoice template style is independent from application appearance. Keep old settings files loadable and maintain current customer/settings screens.
- **VALIDATE**: `npm run typecheck`, `npm run lint`, and `npm test`; manually switch all three appearance choices.

### Task 9: UPDATE docs and run final acceptance validation

- **IMPLEMENT**: Update README and `.agents/AGENTS.md` with the actual Phase 2 architecture, scope boundaries, commands, invoice model/math/date rules, and remaining Phase 3 issuance work. Record any intentionally deferred optional controls.
- **PATTERN**: Existing README development and feature-status sections; `.agents/AGENTS.md` current structure and testing section.
- **GOTCHA**: Do not describe PDF issuance, QR generation, archive snapshots, or correction flow as implemented.
- **VALIDATE**: Execute all commands in Validation Commands; manually follow the test journey list below.

---

## TESTING STRATEGY

### Unit Tests

- `money.test.ts`: decimal hours and rates; blank/partial/invalid text; exact and near half-cent cases; negative and upper-bound handling; CHF/EUR formatting; line rounding before summing; ensure display formatting never feeds arithmetic.
- `dates.test.ts`: real/invalid dates; leap day; adding zero/positive calendar days; month/year boundary; stable results independent of host timezone/DST.
- `invoiceValidation.test.ts`: valid complete and incomplete drafts, malformed snapshots/IDs/currencies, invalid persisted version and date.
- Template/field-map helpers: every editable field maps to an editor target; totals remain read-only.

### Integration Tests

- Draft store defaults only when file is absent; valid round-trip; schema/version rejection; malformed JSON recovery; interrupted replacement leaves recoverable data; multiple saves do not leave stale state.
- IPC rejects malformed drafts and untrusted senders; renderer receives safe structured errors; valid load/save round-trip works.
- Renderer draft workflow verifies selected customer and rows persist/reload, customer replacement confirms destructive edits, and new drafts do not increment `nextSequence`.

### Edge Cases

- No customer CSV, empty customer list, a customer with Unicode/long structured address, and settings partially configured.
- Zero line rows, one row, many rows, long descriptions, blank row during typing, fractional hours, zero/invalid/large rates, currency switch, and one-cent totals.
- Save failure, corrupt draft, rapid edits before debounce, app close/reopen, and changes to settings/customer after draft creation.
- Preview fields mapped after inserting/removing rows and after row pagination; focus target on next page; keyboard-only use; narrow window and OS text scaling.
- System appearance responds to OS setting; explicit Light/Dark override persists; invoice paper remains light/template-colored in dark app mode.
- Payment page placeholder is visibly non-scannable if included.

## VALIDATION COMMANDS

Run from the repository root after implementation. The README and AGENTS phase 1 guidance already prescribe these project checks.

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
npm run format:check
```

### Level 2: Unit and Integration Tests

```bash
npm test
```

### Level 3: Build and Runtime Smoke Check

```bash
npm run build
npm run smoke
```

### Level 4: Manual Validation

1. Launch with `npm run dev`; open the invoice workspace with and without a selected customer CSV.
2. Create a draft, select a customer, add/edit/remove rows, enter fractional hours/rates, and verify each rounded line amount and the grand total.
3. Set invoice date and due term; verify calendar-day due date across month/year and leap-day cases.
4. Switch template and verify both use the same invoice values; inspect short and long invoices at A4 desktop preview size, including long descriptions and rows near page breaks.
5. Click preview fields with mouse and keyboard; verify the exact editor control is focused after row insertion/deletion and pagination.
6. Restart the app; confirm the current draft restores and `nextSequence` remains unchanged.
7. Switch System, Light, Dark and confirm only app chrome changes appearance, not invoice paper.
8. Exercise failed autosave or a malformed draft fixture; verify the app reports an actionable error and does not erase the saved data.

### Level 5: Additional Validation

Visually compare the sample-recreation template with the committed `example_invoice.pdf`; check at minimum 375x812, 768x1024, and 1440x900 windows and keyboard-only focus order. Cross-platform packaging remains Phase 4/release validation.

## ACCEPTANCE CRITERIA

- [ ] New invoice draft initializes from current settings/customer data and existing saved draft restores on launch.
- [ ] User can choose a customer, enter/edit/remove stable-ID line items, and edit invoice/due dates.
- [ ] Due date derives from configured calendar days and can be manually overridden without timezone drift.
- [ ] Each valid line amount is calculated from decimal strings, rounded to cents half-up, and invoice total is the sum of rounded line amounts.
- [ ] Suggested invoice number uses prefix/year/sequence and draft activity never increments or reserves the sequence.
- [ ] Both templates render the same structured draft into A4 preview pages and handle long descriptions/rows without clipping.
- [ ] Every editable preview target has an accessible name and focuses the corresponding editor field using stable IDs; calculated totals remain read-only.
- [ ] Draft autosaves, restores, and recovers safely from persistence errors without replacing unreadable data.
- [ ] System/Light/Dark works for app UI; invoice paper styling is unchanged by app appearance.
- [ ] The UI is visually unified across the invoice workspace, customer/settings screens, and both themes: shared spacing, alignment, typography, and control styles are consistent, with no observed misalignment, clipping, overlap, unintended horizontal scrolling, or other visible layout defects at supported window sizes and text scaling.
- [ ] Any payment-page preview in this phase is clearly non-scannable; actual Swiss QR-bill generation is not represented as complete.
- [ ] Existing customer and settings flows remain functional; main/preload/renderer boundaries and IPC validation stay intact.
- [ ] Unit/integration coverage exercises math, dates, persistence, IPC, focus mapping, and edge cases; all prescribed validation commands pass.
- [ ] README and `.agents/AGENTS.md` correctly describe implemented Phase 2 behavior and the Phase 3 boundary.

## COMPLETION CHECKLIST

- [ ] Tasks completed in dependency order with per-task validation.
- [ ] Full typecheck, lint, format check, Vitest, production build, and smoke run pass.
- [ ] Manual editor, restore, pagination, focus, and appearance journeys pass.
- [ ] No existing Phase 1 behavior regresses.
- [ ] Acceptance criteria and docs are complete.

## NOTES

- The PRD says to preview all invoice pages and the QR-bill page but schedules actual QR-bill generation in Phase 3. This plan treats any Phase 2 payment page as a non-scannable visual placeholder and calls out that boundary explicitly.
- The PRD mentions logo, color, and optional-section controls. Add these only to the extent needed for the two templates and a usable sample recreation; avoid turning Phase 2 into a freeform template editor. A logo must be selected and handled through the main process, never loaded through an arbitrary renderer file URL.
- Pin any added decimal package version after checking the version compatible with the repository's current Node/Electron toolchain. Prefer a well-maintained decimal library over custom financial arithmetic.
- Phase 2 does not commit invoice numbers, generate the final PDF, build an actual Swiss QR-bill, write archive snapshots, or implement replacement/correction issuance. Those are Phase 3.

**Confidence:** 8/10 for one-pass implementation. Remaining risks are preview pagination strategy, the exact boundary between template customization and Phase 2 scope, and visual matching without additional annotated design measurements. The agreed math/date policies remove the main domain ambiguities.
