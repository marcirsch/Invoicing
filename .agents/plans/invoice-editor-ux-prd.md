# Brownfield PRD: Invoice Editor UX Improvements

**Status:** Ready for implementation planning  
**Product:** Local Invoicing App  
**Change type:** Brownfield UX and workflow improvement  
**Platforms:** macOS and Windows

## 1. Executive Summary

The Local Invoicing App already supports invoice editing, live paginated preview, issue-time validation, PDF issuance, and customer CSV management. Recent use has exposed several connected workflow problems: invoice-number proposals are separated from the override field, preview pages can be too wide for the available pane, the issue action is difficult to reach, issue errors appear before the user attempts to issue, the CSV source can be changed from both Customers and Settings, and users cannot select a service date for an invoice row.

This change improves those existing workflows while preserving the security model and compatibility with existing drafts and issued records. The invoice editor will present one effective invoice number, allow a service date on each invoice row, keep the preview within its available width, keep the issue action accessible, and defer issue errors until the user tries to issue. Customer CSV selection and creation will be managed only from Customers.

**Goal:** Make preparing, reviewing, and issuing an invoice predictable on small and standard screens, while preserving accurate previews and immutable issued records.

## 2. Mission and Principles

Help a small-business user complete and review an invoice confidently before the app creates its permanent issued record and PDF.

- Keep the draft as the source of truth for the editor, preview, and issuance.
- Show validation when it can help the user recover, not while an untouched draft is being prepared.
- Keep the main issuance action visible and clearly labeled without obscuring the invoice or editor.
- Keep preview scaling screen-only; the invoice PDF retains its current A4 output.
- Preserve existing customer data, issued invoices, and Electron process boundaries.

## 3. Target Users

### Primary: Small-business invoice creator

- Runs a small Swiss business and prepares invoices locally.
- Is comfortable with ordinary desktop forms but should not need to understand invoice internals or debug layout issues.
- Needs to identify and correct issues, compare the invoice preview with the entered data, and issue the intended invoice number.

### Context and pain points

- Uses the app in a constrained desktop window or on a small screen.
- May have a saved draft open while changing invoice numbering settings.
- Needs to understand a failed issue attempt from the fields that require correction.
- Expects customer-source management to have one clear home.

## 4. Scope

### Core functionality

- ✅ Present the current proposed invoice number in the editable issue-number field and provide a Revert action.
- ✅ Keep the current proposal, editable value, preview number, and issued number consistent.
- ✅ Update the active draft’s proposal when prefix, year, or sequence settings change.
- ✅ Scale preview pages to fit the width available in the preview pane while preserving page proportions.
- ✅ Keep a labeled Issue invoice action persistently available beside the editor, with compact invoice-number and total context.
- ✅ Defer invoice-issue validation feedback until the user attempts issuance; then associate errors with relevant controls and focus the first invalid control.
- ✅ On an issue attempt with no service rows, add a blank row and show actionable validation feedback.
- ✅ Restrict customer CSV selection, creation, and initialization to the Customers area.
- Allow users to select a service date for each invoice row and carry that date consistently through draft restoration, preview, and issued PDF.

### Technical and integration scope

- ✅ Extend the current draft and issued-invoice models as needed while reusing issue-validation rules, settings, and the Electron IPC boundary.
- ✅ Keep main-process issuance validation authoritative.
- ✅ Keep display scaling and the sticky action presentation out of print rendering.
- ✅ Preserve the existing CSV format and maintain compatibility with existing draft and issued-invoice/archive data when adding service dates.

### Out of scope

- ❌ Changes to invoice numbering format, invoice-number uniqueness rules, or when a number is committed.
- ❌ Changes to invoice totals, QR-bill generation, unrelated PDF contents, archive behavior, or issued-invoice correction policy.
- ❌ New CSV formats, customer-data migrations, or alternate customer storage.
- ❌ A freeform preview zoom control or a redesigned invoice template.
- ❌ New authentication, cloud storage, email delivery, or third-party service integration.

## 5. User Stories

1. **As a user preparing an invoice,** I want the proposed number to appear in the editable number field, **so that** I can issue it as proposed or enter another number. For example, the field shows `RE-2026-001` and Revert restores that exact current proposal.
2. **As a user adding or editing an invoice row,** I want to select its service date, **so that** each row can show when that work took place.
3. **As a user with an open draft,** I want numbering-setting changes to update the displayed proposal and number field, **so that** I do not issue a stale number. A prefix change from `RE-` to `INV-` updates the draft proposal and preview to the new configured value.
4. **As a user on a small screen,** I want the preview page to fit the available preview width, **so that** I can review it without horizontal scrolling.
5. **As a user editing a long invoice,** I want Issue invoice to stay available near the editor, **so that** I can complete the workflow without searching for the action.
6. **As a user preparing an incomplete invoice,** I want blank fields to remain visually calm until I attempt issuance, **so that** I can enter information without error messages shifting the layout.
7. **As a user whose issue attempt fails,** I want invalid fields highlighted with clear associated messages and focus moved to the first problem, **so that** I can fix the invoice efficiently.
8. **As a user who attempts to issue an invoice with no service rows,** I want a blank row created with relevant errors, **so that** I have a direct place to complete the invoice.
9. **As a user managing customers,** I want CSV selection and creation in one Customers area, **so that** I know where to manage the customer source.

## 6. Core Architecture and Patterns

### Existing architecture

- `src/renderer` contains the React invoice workspace, settings/customer views, and preview.
- `src/shared` contains the invoice/settings models, money calculation, and issue validation.
- `src/main` owns local file access, settings and archive persistence, PDF/QR generation, and validated IPC handlers.
- `src/preload` exposes the narrow renderer bridge.
- The active invoice draft is stored separately from immutable issued snapshots and PDFs.

### Required patterns for this change

- Derive the proposed number from the saved prefix, year, and next sequence. Reconcile an open draft with a changed proposal without changing its customer, rows, dates, or other contents.
- Keep the current editable number as the sole displayed value used by the preview and issue request. Revert targets the latest proposal.
- Measure the preview container and scale the on-screen page proportionally. Do not change page geometry used by pagination or Chromium printing.
- Track whether an issue attempt has occurred. Only then display issue validation; continue to run full validation in the main process before issuance.
- Keep field-level error text associated through the existing accessible input relationships. Put service-row messages in a row-wide region so they do not collapse into narrow table columns.
- Keep the persistent action visually and behaviorally associated with the editor. It must not cover the preview, inputs, or keyboard focus.
- Do not add generic IPC or renderer filesystem access. Persist service dates through the existing draft and issued-invoice flows, with backward-compatible defaults.
- Store each service row's date on that row, so editing or changing the invoice date does not silently replace the chosen service dates. Preserve the existing date-only representation and make old drafts behave as they do today by treating a missing row date as the draft invoice date.

## 7. Feature Specifications

### 7.1 Invoice number proposal and manual value

- Replace the separate read-only Suggested invoice number and blank Invoice number override with one labeled, editable number field.
- Initially populate the field with the current proposal.
- Add an end-of-field Revert button with an accessible name. Revert resets the value to the latest proposal and is unavailable or inert when the value already matches it.
- Use the field value consistently in the preview, issue validation, issue request, resulting PDF, QR-bill message, and archive record.
- If prefix, year, or next sequence changes, update the draft proposal and replace the field value with that new proposal, including when the field previously contained a manual value. This is the user's selected behavior.
- Preserve the current rule that drafts do not reserve numbers; issuance commits the selected valid number through existing service logic.

### 7.2 Responsive preview

- Fit the entire A4 page width to the available preview pane width, preserving the page aspect ratio and limiting scale to 100%.
- Recompute the fit on window or layout resize. Allow vertical scrolling through pages.
- Do not add horizontal scrolling to access the page at supported editor layouts.
- Keep scaled dimensions accounted for in layout so preview pages do not overlap or leave misleading blank gaps.
- Apply scaling only in the interactive renderer. Print-only output remains unscaled at A4 dimensions and preserves current pagination and PDF layout.

### 7.3 Persistent issue action

- Place one clearly labeled Issue invoice action in a persistent bottom action bar aligned to the invoice editor pane.
- Show compact current invoice-number and total context in the bar; the total is derived from the draft’s existing money calculation.
- Keep the action available while the user scrolls through the editor, without overlaying the preview or hiding the final form fields.
- Preserve the current issuing/loading state, success/error feedback, and final confirmation behavior.
- At short viewport heights or high zoom, adapt the bar so keyboard focus and content remain visible, even if the bar must return to normal document flow.

### 7.4 Issue validation and empty rows

- Do not render issue-specific errors when opening a draft, adding a row, typing, or leaving a field before the first issue attempt.
- On Issue invoice, run the existing issue validation against the current draft and number. If invalid, retain all values, show a concise error summary, mark affected inputs, associate messages with their controls, and focus the first invalid control.
- If there are zero service rows, create exactly one blank row as part of the failed issue attempt. Do not invoke issuance until the draft passes client-side feedback validation; the main process still performs final validation.
- After the first issue attempt, keep errors current as the user edits and clear each error when its condition is corrected. A later invalid attempt refreshes the summary and focus target.
- Show row-level field errors in a dedicated full-width area associated with the row; do not render long messages inside the narrow hours/rate table cells.
- Treat a zero or invalid invoice total as a form-level condition and direct the user to the relevant service row fields.
- Preserve validation for sender/customer data and dates. For fields maintained on Settings or Customers screens, show a clear summary and a direct navigation action where currently supported.
- Retain the authoritative validation in the main process before any number advancement, PDF write, or archive commit.

### 7.5 Customer CSV control location

- Keep choose CSV, create CSV, and initialize-empty-CSV actions in Customers.
- Remove these actions and the empty-file initialization prompt from Settings.
- Settings may show the currently selected customer CSV path as read-only. Archive-folder selection remains in Settings.
- Do not change the customer CSV service, format, delimiter handling, or external-edit conflict behavior.

### 7.6 Service date selection for invoice rows

- Restore a date picker for each service row so a user can select or edit the date associated with that work.
- Use the row's selected service date in the editor and the existing Date column in the invoice preview and issued PDF.
- Keep service dates independent from invoice date and due date. Changing the invoice date must not overwrite explicitly selected row dates.
- New rows should use the default behavior from the last version where row-date selection worked. If that behavior cannot be recovered, initialize the row date from the current invoice date.
- Persist row dates in the existing draft and issued-invoice flows. Existing saved drafts and archived records without row dates must remain readable and render using the current invoice-date behavior.
- Validate row dates as ISO date-only values at existing issue boundaries, associate validation with the row's date control, and retain main-process validation before issuance side effects.
- Keep row dates keyboard accessible and preserve preview-to-editor focus mapping for each row.

## 8. Technology Stack

Use the repository’s existing stack; this change should not require new runtime dependencies.

| Area | Existing technology |
|---|---|
| Desktop shell | Electron 44 |
| UI | React 18, TypeScript 5, Electron Vite 5 |
| Validation | Zod 3 and shared TypeScript invoice validation |
| Money calculations | Decimal.js 10.6 |
| PDF/QR-bill | Chromium print, `swissqrbill` 4.4.1, PDFKit 0.17.2, `@cantoo/pdf-lib` 2.11.1 |
| Checks | Vitest 4, ESLint 9, Prettier 3 |

Exact dependency ranges are recorded in `package.json` and `package-lock.json`.

## 9. Security and Configuration

- No authentication or authorization changes are required; this remains a local, single-user desktop app.
- Settings continue to be persisted by the existing main-process settings store.
- Customer CSV selection remains mediated by native dialogs in the main process and exposed through the existing narrow preload API.
- No new environment variables, remote endpoints, or permissions are introduced.
- Issuance continues to validate data in both the renderer for feedback and the trusted main process before side effects.
- Issued invoices and PDFs remain immutable; the change must not rewrite records already in the archive.

## 10. API Specification

No public IPC or persisted-data contract change is expected. Reuse existing draft load/save, settings, customer CSV, and invoice issue interfaces.

The renderer-to-issue boundary continues to carry the selected invoice number with the draft. The main process independently validates the request and rejects duplicate or invalid numbers using current behavior. If implementation discovers a necessary interface change, keep it narrow, typed, schema-validated, and backward-compatible with existing local data.

## 11. Success Criteria

### Functional requirements

- ✅ The current proposed invoice number is visible and editable in a single field.
- ✅ Revert restores the latest proposal; settings changes update both the proposal and editable field, including after manual edits.
- ✅ The invoice preview displays the same number that will be issued.
- ✅ Preview pages fit the available preview width at small and standard window sizes without horizontal scrolling.
- ✅ Screen scaling does not alter printed page size, pagination, or PDF content.
- ✅ Issue invoice remains available alongside the editor and does not obscure controls or the preview.
- ✅ No issue errors appear before an issue attempt.
- ✅ An invalid issue attempt displays associated field errors and focuses the first invalid field; correcting values removes the relevant errors.
- ✅ An issue attempt with no rows creates one blank row and shows useful feedback without issuing or advancing the number.
- ✅ Main-process validation still prevents invalid or duplicate issuance and does not advance numbering on failure.
- ✅ Customer CSV selection, creation, and initialization are available in Customers and not in Settings.
- ✅ Existing CSV data, invoice drafts, issued snapshots, and archived PDFs remain readable and unchanged.

### Quality indicators

- No unintended horizontal overflow, overlap, clipped controls, or disruptive row-height expansion at supported window sizes.
- Error text remains understandable with keyboard and screen-reader navigation and is not communicated by color alone.
- Sticky action behavior does not obscure the keyboard focus indicator at short heights or zoom.
- Existing type, lint, formatting, unit/integration, build, and smoke checks continue to pass.

## 12. Implementation Phases

### Phase 1: Number proposal synchronization

**Status:** Implemented.

**Goal:** Make the proposed and effective invoice number consistent throughout an open draft.

- ✅ Use a single editable field initialized from the current proposal.
- ✅ Add accessible Revert behavior.
- ✅ Reconcile draft proposal and field value on prefix/year/sequence changes and draft restoration.
- ✅ Verify preview and issued number consistency.

**Validation:** Test proposal derivation, edits, revert, settings changes after an override, draft reload, and issuance/archive number parity.  
**Estimate:** 0.5–1 engineering day.

### Phase 2: Validation timing and recovery

**Status:** Not implemented. This is the next phase.

**Goal:** Remove premature errors and make failed issue attempts easy to correct.

- [ ] Gate issue validation feedback on an explicit issue attempt.
- [ ] Add one blank row when an issue attempt has no rows.
- [ ] Add field-associated error styling, a concise form summary, first-error focus, and stable row-wide feedback placement.
- [ ] Keep main-process validation authoritative.

**Validation:** Cover empty draft, blank row, partial row, invalid amount, zero total, sender/customer/date errors, correction, and duplicate number paths.  
**Estimate:** 1–2 engineering days.

### Phase 3: Preview fit and issue action

**Status:** Not implemented.

**Goal:** Make the preview responsive and keep issuance accessible during editing.

- [ ] Fit preview pages to the available pane width on resize, without affecting print output.
- [ ] Add a persistent editor-aligned issue bar with number and total context.
- [ ] Handle short-height and zoom layouts without obscuring content or focus.

**Validation:** Inspect small, standard, and expanded windows, resize behavior, keyboard tabbing, screen-only scaling, and A4 print output.  
**Estimate:** 1–2 engineering days.

### Phase 4: Consolidate CSV controls and regression review

**Status:** Complete (2026-10-24).

**Goal:** Make Customers the only place to select or create a customer CSV and verify end-to-end behavior.

- [x] Remove CSV actions and initialization prompts from Settings while preserving archive-folder settings.
- [x] Verify the Customers CSV workflows and read-only path display in Settings.
- [x] Run repository checks and perform a complete invoice creation/issue workflow.

**Validation:** The focused CSV/settings integration tests (14 tests), full test suite (81 tests), typecheck, lint, format check, build, and isolated Electron smoke run passed. Manual macOS Electron checks covered CSV creation and selection, cancellation, empty-file initialization, delimiter ambiguity and recovery feedback, read-only Settings path, archive-folder selection, saving unrelated settings, and a complete disposable invoice issuance with archived PDF.
**Estimate:** 0.5–1 engineering day.

### Phase 5: Restore service dates on invoice rows

**Status:** Not implemented.

**Goal:** Let users select a date for each service row and preserve it throughout the draft, preview, and issued invoice.

- Inspect repository history or another available prior version to recover the working row-date behavior, including the default used when adding a row.
- Add a date-only value to each service row and a date input in the row editor. If no prior default can be recovered, default a new row to the current invoice date.
- Render and issue each row with its own date; changing invoice or due dates must not overwrite selected service dates.
- Keep older drafts and issued archives compatible by falling back to the invoice date when a row has no stored date.
- Add validation, persistence, migration/backward-compatibility, preview/PDF, and preview-to-editor focus coverage.

**Validation:** Verify date selection on new and existing rows, row addition and duplication, draft save/reload, legacy records without row dates, invalid date feedback, invoice-date edits, preview focus, and exact date parity between preview and issued PDF. Run typecheck, lint, format check, all tests, build, and smoke checks.
**Estimate:** 1–2 engineering days, subject to confirming prior behavior and archive compatibility.

**Overall estimate:** Approximately 4–8 engineering days, excluding cross-platform release validation.

## 13. Future Considerations

- User-controlled preview zoom, if fit-to-width proves insufficient for detailed inspection.
- Broader responsive redesign of invoice tables and other editor areas if small-window usability issues remain.
- Usability testing with keyboard-only and screen-reader users.
- Windows-specific visual and packaging verification as part of the broader release process.

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Screen scaling interferes with measured pagination or preview field targeting. | Keep intrinsic page layout and pagination measurements separate from screen scaling; verify field targeting after resize. |
| A persistent action bar covers editor content or keyboard focus. | Reserve content clearance, constrain it to the editor, and adapt it at short heights or zoom. Test tabbing in both directions. |
| Validation feedback causes row-height shifts or poor table readability. | Use concise messages in a full-width row area and test blank, partial, and corrected rows. |
| Updating the number proposal unexpectedly changes a draft’s selected number. | This behavior is explicit: settings changes always replace the editable field with the new proposal. Test while an override is present and communicate the updated value visibly. |
| Settings cleanup removes a CSV recovery action that users still need. | Keep select/create/initialize actions available from Customers and verify empty-file setup there before removing the Settings actions. |

## 15. Appendix

### Related repository documents

- Product requirements: [`.codex/PRD.md`](../../.codex/PRD.md)
- Repository guidance: [`.agents/AGENTS.md`](../AGENTS.md)
- Renderer accessibility guidance: [`.agents/reference/components.md`](../reference/components.md)
- Preview/PDF guidance: [`.agents/reference/pdf-preview.md`](../reference/pdf-preview.md)
- Invoice domain guidance: [`.agents/reference/invoice-domain.md`](../reference/invoice-domain.md)
- Existing QA findings plan: [`.agents/plans/fix-invoice-settings-and-preview-qa-findings.md`](fix-invoice-settings-and-preview-qa-findings.md)

### Relevant implementation areas

- `src/renderer/components/InvoiceWorkspace.tsx`
- `src/renderer/styles/global.css`
- `src/renderer/hooks/useInvoiceDraft.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/SettingsForm.tsx`
- `src/renderer/components/CustomerList.tsx`
- `src/shared/invoice/issueValidation.ts`

### UX references

- [GOV.UK validation pattern](https://design-system.service.gov.uk/patterns/validation/)
- [WAI forms: notifications](https://www.w3.org/WAI/tutorials/forms/notifications/)
- [SAP Fiori action placement](https://www.sap.com/design-system/fiori-design-web/v1-120/foundations/best-practices/global-patterns/action-placement)
- [Material Design floating action button guidance](https://m1.material.io/components/buttons-floating-action-button.html)
- [WCAG 2.2: Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
