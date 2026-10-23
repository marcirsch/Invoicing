# Plan: Fix invoicing settings and preview QA findings

## Summary

Resolve the seven QA findings around payment-term validation, stale invoice previews, unsaved Settings edits, preview navigation, invoice-number overrides, QR-bill preview completeness, and appearance control placement. Keep invoice calculations, issued PDF content, and archived invoice snapshots consistent with what the user sees while editing.

**Complexity:** High  
**Risk:** Medium-high. The work crosses persisted settings, the Electron IPC boundary, draft state, measured pagination, and PDF/QR rendering. Existing issued invoice and archive behavior must remain stable.  
**Confidence:** 8/10. The relevant paths and current failure mechanisms are known; component-level automated tests are limited, so final UI behavior needs manual Electron verification.

## User story

As an invoicing user, I want invalid settings to be explained without crashing the app, and the live preview to reflect and navigate to the draft I am editing, so I can review the complete invoice before issuing it. I also want folder selection to preserve staged Settings edits and appearance to be available from the app header.

## Scope and decisions

- Payment terms are valid from **0 through 3650 whole calendar days**. The limit matches the existing `addCalendarDays` guard.
- Preserve compatibility when loading previously saved settings: do not make the permissive persisted-settings base schema reject a legacy integer above 3650. Enforce the upper limit in the interactive/full settings schema, display an inline error, and prevent the unsafe date calculation.
- If an invalid legacy payment term is present, retain the last valid due date on an existing draft. When initializing a new draft, use the normal default term of 30 days until the user fixes Settings. This is a safety fallback, not a silent rewrite of the saved preference.
- Choosing a CSV or archive folder persists that path immediately, while all other Settings edits remain staged in the form. The selected path must be merged into the current form state without reloading the whole Settings object. Delimiter selection must not refresh and overwrite staged Settings fields.
- Move appearance to a small, permanent header control and persist it immediately. Remove the control from Invoice defaults.
- The preview must include the QR-bill as its final A4 sheet. If the QR-bill cannot be generated from the current draft, show a clear, actionable incomplete-data state on that sheet.
- Preview click-to-edit is for fields on the current invoice draft. Sender and customer profile details remain managed through Settings and Customers. Totals remain read-only.
- Keep the QR-bill page screen-only in the editing preview. The PDF generation path remains responsible for placing exactly one QR-bill at the end of the issued PDF.

## Context and code references

- Payment-term parsing and validation: `src/shared/validation/settingsValidation.ts:9-50`; Settings field and inline validation: `src/renderer/components/SettingsForm.tsx:27-80,207-214`; existing date guard: `src/shared/invoice/dates.ts:15-18`.
- Draft creation and due-date updates: `src/renderer/hooks/useInvoiceDraft.ts:11-29,61-78,97-122`.
- File chooser state refreshes: `src/renderer/App.tsx:98-127`. The chooser handlers currently refresh Settings after returning a path, replacing unsaved fields with persisted values.
- Settings persistence and appearance application: `src/main/ipc/settingsHandlers.ts:20-43`; app-level theme application and state: `src/renderer/App.tsx:72-97`.
- Typed IPC contract and preload bridge: `src/shared/ipc/contracts.ts:17-35`; `src/preload/api.ts:11-58`; handler registration and sender checks: `src/main/ipc/registerHandlers.ts:66-117`.
- Permanent app header: `src/renderer/components/AppShell.tsx`; header and responsive layout styles: `src/renderer/styles/global.css:50-85,594-625`.
- Preview pagination state and measurement: `src/renderer/components/InvoiceWorkspace.tsx:57-189`. The measurement effect only replaces page line items when line IDs change, retaining stale objects when a description or other value changes.
- Invoice override and editor IDs: `src/renderer/components/InvoiceWorkspace.tsx:227-317,397-481`; preview invoice number and line rows: `src/renderer/components/InvoiceWorkspace.tsx:643-720`.
- QR-bill PDF assembly: `src/main/services/qrBillService.ts:6-65`; domain draft types: `src/shared/domain/invoice.ts:1-29`.
- Existing test locations: `tests/unit/settingsValidation.test.ts`, `tests/unit/dates.test.ts`, `tests/unit/invoicePageLayout.test.ts`, `tests/unit/qrBillPdf.test.ts`, `tests/integration/settingsStore.test.ts`, and `tests/integration/ipcValidation.test.ts`.
- Product requirements and conflicting documentation: `.codex/PRD.md` (complete preview requirement); `README.md:31-35` (currently says preview omits the QR-bill).

## Implementation plan

### 1. Make payment-term validation safe end to end

1. Extend `settingsValidation.test.ts` to cover valid bounds (0 and 3650), and reject a negative, fractional, or over-limit interactive value.
2. Add the maximum to the full `settingsSchema`, while leaving the persisted/base schema able to read legacy nonnegative integers. Keep the existing field-level error mapping so `SettingsForm` displays the message beside Payment term days.
3. Add `min`, `max`, and `step=1` to the numeric input. Continue validating in the schema; HTML constraints alone are not sufficient.
4. Guard draft creation and due-date recalculation in `useInvoiceDraft`. An invalid saved value must not reach `addCalendarDays` or throw. Keep an existing draft's last valid due date while the setting is invalid; use the 30-day default when a new draft is initialized under that condition.
5. Verify correcting the field recalculates due dates according to the existing invoice-date behavior, and saving invalid settings is rejected without replacing the stored valid settings.

**Validate:** `npm test -- tests/unit/settingsValidation.test.ts tests/unit/dates.test.ts tests/integration/settingsStore.test.ts` and `npm run typecheck`.

### 2. Preserve staged Settings edits across chooser actions

1. Change CSV and archive chooser callbacks in `App.tsx` to merge only the returned path into the current Settings form state. Do not reload the whole settings object after the chooser returns.
2. Remove the Settings refresh after delimiter changes; refresh customer data as needed without replacing staged settings fields.
3. Keep the existing persistence semantics for paths. Saving the form later should still save the user's staged company/default values and selected paths together.
4. Manually verify with unsaved company details and defaults: choose each folder, return to Settings, and confirm all staged values remain while the path is shown. Save and reload to confirm persistence.

**Validate:** `npm run typecheck`; manual Electron verification of CSV folder, archive folder, delimiter change, save, and reload.

### 3. Make preview pagination use current draft data

1. Change pagination state in `InvoiceWorkspace` to store stable line IDs per page, rather than retaining `InvoiceLineItem` object snapshots.
2. Derive each rendered page's current line items from the current draft on every render. Keep the existing measured page assignment algorithm and page breaks.
3. Add a focused pure-helper test proving that the same page/line IDs resolve to updated description, hours, and rate values after the draft changes.
4. Preserve measurement invalidation when content changes; ensure the fresh values also participate in the content key used for height measurement.

**Validate:** `npm test -- tests/unit/invoicePageLayout.test.ts` and `npm run typecheck`; manually edit an existing description, hours, and rate and confirm preview updates without adding or deleting a row.

### 4. Unify displayed invoice number and enable preview navigation

1. Define the displayed invoice number as the trimmed override when nonempty, otherwise the generated suggestion. Use it consistently for preview rendering and issue/QR preview validation; preserve current service-side normalization and issued-record behavior.
2. Turn preview targets for current draft fields into keyboard-operable controls with clear accessible names: invoice number, customer selection, invoice date, due date, line description, hours, and rate. Map each target to the existing editor control ID.
3. On activation, scroll the corresponding editor field into view and focus it. Provide visible focus feedback and ensure the behavior works by mouse and keyboard, including fields on later pages.
4. Keep totals and sender/customer profile blocks noninteractive. They are computed or maintained in their respective Settings/Customers screens.
5. Keep the PDF/print-only rendering inert: preview navigation controls and their focus styling must not appear in printed output.

**Validate:** `npm run typecheck`; manually click and keyboard-activate each supported preview target, confirm the matching field receives focus, and verify that `QA-2026-041` replaces the suggestion in the preview and remains the number on issue/PDF/archive.

### 5. Share QR-bill data mapping and render the complete live preview

1. Extract a typed QR-bill data mapper usable by both the PDF service and renderer. Preserve the current IBAN normalization, amount-from-cents conversion, currency, invoice message truncation, address mapping, and language.
2. Update `qrBillService.ts` to consume the shared mapper without changing PDF page size, QR-bill placement, or the established issued invoice and archive snapshot.
3. Add a renderer-only QR-bill preview component using the installed `swissqrbill/svg` browser entry. Mount the library-produced SVG through a controlled element/ref; do not recreate QR geometry in HTML.
4. Append a separate A4 preview sheet after invoice pages, with the library's 210 × 105 mm bill positioned at the bottom to match the existing PDF layout. Keep it separate from the measured invoice sheet so closing-height selectors and pagination remain stable.
5. When required QR data is incomplete or invalid, render the same final sheet with a concise checklist naming the missing or invalid inputs (for example, sender/recipient address, IBAN, positive total, or invoice number). Do not throw or silently omit the sheet.
6. Hide the editing-only QR sheet when rendering print-only content. The PDF service must continue to append one QR-bill, avoiding duplication.
7. Update `README.md` to say the live preview includes invoice pages and the QR-bill final page, with an incomplete-data state when it cannot yet be rendered. This resolves the conflict with `.codex/PRD.md` in favor of the complete-preview requirement.
8. Add mapper tests for normalization, amount/currency/message mapping, incomplete data, and parity with values consumed by PDF generation. Extend the existing PDF assertions to retain A4 and QR-bill-last-page behavior.

**Validate:** `npm test -- tests/unit/qrBillData.test.ts tests/unit/qrBillPdf.test.ts`; `npm run typecheck`; manually compare the on-screen final sheet and issued PDF, confirm the final page is A4 and QR is last, scan/validate a generated QR-bill with the official [Swiss QR-bill validator](https://www.swiss-qr-invoice.org/), and verify the incomplete-data checklist.

### 6. Move appearance to the permanent header with immediate persistence

1. Add a narrow typed `settings:set-appearance` IPC operation accepting only the existing appearance enum. Register it through the current sender-validation and safe-error wrapper.
2. In the main handler, merge appearance into persisted settings without overwriting other values and apply `nativeTheme.themeSource`. Return the persisted appearance.
3. Expose the operation through `IpcApi` and the preload bridge. Keep the bridge narrow and avoid exposing Electron primitives.
4. Add the selector to `AppShell`'s permanent header and remove it from `SettingsForm`. Style it to remain accessible and usable at standard, expanded, and 320px narrow widths.
5. On selection, update the rendered theme immediately and persist appearance independently of the staged Settings form. If persistence fails, show a non-blocking error and restore the last persisted selection; do not discard other unsaved edits.
6. Verify the chosen appearance remains selected across navigation and relaunch, and that changing it does not save or reset staged Settings edits.

**Validate:** `npm test -- tests/integration/settingsStore.test.ts tests/integration/ipcValidation.test.ts`; `npm run typecheck`; manual Electron checks for theme change, persistence after relaunch, staged Settings preservation, and narrow header layout.

### 7. Run regression checks and close documentation gaps

1. Run the focused tests above, then the full unit/integration suite and repository static checks.
2. Perform the complete QA workflow: create/edit customer, stage Settings, choose folders, save, enter valid and invalid payment terms, edit line fields, navigate preview targets, set invoice override, inspect both preview pages, issue invoice, and inspect PDF/archive consistency.
3. Check standard and expanded layouts plus a 320px narrow viewport. Confirm no header overflow and that controls remain keyboard-accessible.
4. Confirm the issued PDF and archive still agree on the overridden invoice number and total (**EUR 301.26** in the reported QA fixture); the PDF remains A4 and has the QR-bill as its final page.
5. Record QR scanning/validator outcome; the prior QA did not run a scanner, so that remains an explicit verification item.

**Validate:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build`. Run `npm run smoke` if supported by the local test environment, then repeat the manual Electron workflow above.

## Acceptance criteria

- Entering `-1`, a fractional value, or a value above 3650 shows an inline validation message and leaves the application usable; no due-date helper exception blanks the app.
- An invalid term cannot overwrite previously saved valid settings. Existing draft due dates remain stable until the setting is corrected.
- Selecting CSV/archive folders or changing delimiter preserves all other unsaved Settings edits.
- Editing a line description, hours, or rate updates the live preview immediately, even when its line ID and page assignment are unchanged.
- Clicking or keyboard-activating supported preview content focuses the corresponding current-draft editor field. Profile details and totals remain noninteractive.
- A nonempty invoice-number override appears in preview, issued PDF, QR-bill message, and archive record.
- The live preview shows the QR-bill as the final A4 sheet, or shows an actionable incomplete-data state there. Issued PDFs still contain exactly one QR-bill final page.
- Appearance is available from the permanent header, applies immediately, persists across relaunch, and does not alter other staged Settings values.
- Standard, expanded, and 320px narrow layouts remain usable; keyboard focus is visible.

## Test and verification notes

The repository has Vitest unit/integration coverage but no installed component-test harness. Prefer pure helper/schema tests for deterministic behavior and use the real Electron app for focus, responsive layout, rendering, and chooser workflows rather than adding a new test dependency for this repair. Preserve the existing invoice PDF and archive regression checks. No tests or application changes have been run as part of writing this plan.

## References

- SwissQRBill browser/SVG API: [SwissQRBill project documentation](https://github.com/schoero/SwissQRBill)
- Electron `nativeTheme`: [Electron API documentation](https://www.electronjs.org/docs/latest/api/native-theme#themesource)
- Electron `contextBridge`: [Electron API documentation](https://www.electronjs.org/docs/latest/api/context-bridge)
- Electron `ipcMain.handle`: [Electron API documentation](https://www.electronjs.org/docs/latest/api/ipc-main#ipcmainhandlechannel-listener)
- Electron security guidance: [Electron security tutorial](https://www.electronjs.org/docs/latest/tutorial/security/)
