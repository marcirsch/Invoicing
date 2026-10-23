# Feature: Phase 1 — Invoice Number Proposal Synchronization

This implementation plan covers Phase 1 of [Invoice Editor UX Improvements](invoice-editor-ux-prd.md). Validate the existing code and its behavior before implementing; keep the persisted draft and IPC contracts compatible.

## Feature Description

Use one editable invoice-number field for the current proposal and selected invoice number. Initialize it from the configured prefix, year, and next sequence; let the user edit it; and provide an accessible Revert action that restores the latest proposal. Keep the draft, preview (including its QR-bill message), issue validation, and archived invoice on the same number. When prefix, year, or sequence settings change, replace the field value with the newly derived proposal, even if the user had entered an override. Apply the same rule after restoring a saved draft.

This phase does not change invoice-number formatting rules, uniqueness checks, sequence-commit behavior, issuance transactions, archive data, or the draft storage schema.

## User Story

As a user preparing an invoice, I want the current proposed invoice number in one editable field, so that I can issue the proposal or choose another number while seeing the same value in the preview and issued invoice.

## Problem Statement

The editor currently displays a read-only suggested number in the draft form and a separate, initially blank override beside the Issue invoice action. The override is local component state, so it is not part of the autosaved draft. The preview and issue request choose between that transient value and `draft.suggestedNumber`, creating two representations of the number and making manual edits disappear when the draft is restored. The replacement-invoice path also duplicates proposal formatting.

## Solution Statement

Add a small shared proposal-formatting helper based on `Settings.invoicePrefix`, `invoiceYear`, and `nextSequence`. Keep the existing `InvoiceDraft.suggestedNumber` field and persisted schema for backward compatibility, but use it as the draft's current editable invoice number. Initialize new and replacement drafts with the helper. Reconcile the restored or active draft with the current settings proposal when that proposal changes. In the editor, replace the read-only suggestion and override controls with one controlled field bound to `draft.suggestedNumber`, plus Revert. Derive preview and validation directly from that field and issue the draft without a second renderer-side number source.

The existing optional `numberOverride` IPC/service parameter may remain for compatibility with callers or stored artifacts, but this renderer flow should not depend on it. Main-process validation and duplicate-number checks remain authoritative.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Shared invoice numbering helper, invoice draft hook, invoice workspace, issue request wiring, invoice-number unit tests
**Dependencies**: Existing TypeScript/React/Vitest stack; no new runtime or test dependencies

---

## CONTEXT REFERENCES

### Relevant Codebase Files — Read Before Implementing

- `src/shared/domain/settings.ts` (lines 1–14) — Defines the prefix, year, and sequence inputs used to derive the proposal.
- `src/shared/domain/invoice.ts` (lines 13–27) — Defines `InvoiceDraft.suggestedNumber`; preserve this field to avoid a draft migration.
- `src/renderer/hooks/useInvoiceDraft.ts` (lines 11–35, 39–68, 69–105, 149–161) — Creates drafts, loads and autosaves them, applies settings changes, and rotates drafts after issue.
- `src/renderer/components/InvoiceWorkspace.tsx` (lines 17–30, 59–108, 235–270, 303–306, 657–685, 777–779) — Contains the separate override state/control, read-only suggestion, validation/preview number selection, preview target, and QR-bill preview.
- `src/renderer/App.tsx` (lines 195–227, 229–253, 298–311) — Sends the issue request and constructs replacement drafts with a duplicated proposal expression.
- `src/shared/invoice/issueValidation.ts` (lines 35–38, 147–160) — Defaults issue validation to `draft.suggestedNumber` and validates the selected number.
- `src/main/services/invoiceIssuanceService.ts` (lines 36–69, 100–129) — Chooses and validates the effective number before recording the immutable invoice and advancing sequence.
- `src/shared/validation/invoiceValidation.ts` (lines 34–55) — Validates the saved draft. No schema change is expected.
- `src/main/services/draftStore.ts` (lines 12–35) — Loads and saves versioned drafts. Preserve compatibility with existing version-1 data.
- `tests/unit/issueValidation.test.ts` (lines 47–80) — Existing tests for default and explicitly supplied invoice-number validation.
- `tests/integration/draftStore.test.ts` (lines 12–49) — Existing persisted-draft round-trip test; extend or reuse its pattern to confirm an edited number persists.
- `src/renderer/main.tsx` (lines 1–8) — Renderer uses React Strict Mode; ensure proposal reconciliation and loading effects are idempotent.
- `src/preload/api.ts` and `src/shared/ipc/contracts.ts` — Narrow preload/IPC API. Read only if implementation changes issue-call wiring; no contract change is intended.

### New Files to Create

- `src/shared/invoice/numbering.ts` — Pure proposal formatting helper (unless code inspection finds a better existing shared module).
- `tests/unit/invoiceNumbering.test.ts` — Proposal formatting tests.

No new UI component, persistence file, IPC channel, or dependency is required.

### Relevant Documentation to Read Before Implementing

- `.agents/AGENTS.md` — Repository architecture, security, invoice, and test rules.
- `.agents/reference/invoice-domain.md`, especially “Canonical model” and “Numbering and issue transaction” — Keep the draft as source of truth, drafts do not reserve numbers, and issued numbers remain immutable.
- `.agents/reference/components.md`, especially “Forms and invoice tables” and “Preview-to-editor navigation” — Controlled field, accessible labels, and preview-to-editor mapping.
- `.agents/plans/invoice-editor-ux-prd.md`, especially sections 7.1, 9–12 — Phase requirements, explicit settings-change behavior, contracts, and acceptance criteria.

External documentation is not needed: this phase uses existing React, TypeScript, and Vitest patterns and adds no dependency or platform API.

### Patterns to Follow

**Naming and modules:** Use a named exported pure function in `src/shared/invoice/numbering.ts`; import Settings with `import type`. Keep shared logic free of Electron and React imports.

**Controlled state:** `InvoiceWorkspace` receives `draft` and `onChange`. Bind the invoice-number input to `draft.suggestedNumber` and update through `onChange({ suggestedNumber: value })`, following other editor inputs such as the date and row controls.

**Persistence:** `useInvoiceDraft` debounces full-draft autosaves by 500 ms. Updating the existing draft field makes the manually selected number persist without adding a field or schema migration.

**Preview and validation:** `validateIssueDraft` defaults to `draft.suggestedNumber`; the preview and QR-bill preview must also use that exact value. Keep preview target focus behavior by changing the stable target ID with the input ID if appropriate.

**Number formatting:** Preserve current semantics exactly: concatenate prefix and year, then `-`, then `String(nextSequence).padStart(3, '0')`. Do not change how settings validation or issuance advances the sequence.

**Error/issue boundary:** Do not move final validation, uniqueness checks, sequence advancement, PDF generation, or archive writes out of the main process.

---

## IMPLEMENTATION PLAN

### Phase 1: Shared proposal and draft reconciliation

Create and unit-test the proposal formatter, use it for new/replacement drafts, and reconcile the restored/current draft when the derived proposal changes. Settings edits to prefix, year, or sequence intentionally replace a manual invoice-number value with the new proposal. Avoid changing unrelated draft fields.

### Phase 2: Single editable field and shared display value

Replace the read-only suggestion and blank override with one labeled input and Revert action. Store edits in `draft.suggestedNumber`; derive issue validation, preview, preview focus target, and QR-bill message from it. Keep the label explicit (“Invoice number”), make Revert restore the latest derived proposal, and disable or make it inert when the field already equals that proposal.

### Phase 3: Issue integration and regression validation

Wire the renderer’s issue action to submit the current draft number without relying on separate local override state. Preserve the existing service/IPC optional override contract unless a concrete compatibility need is discovered. Verify issue/archive parity and that a successful issue rotates to a fresh draft using the updated settings returned by the main process.

---

## STEP-BY-STEP TASKS

Execute in order. Keep each change focused and run its listed validation.

### Task 1 — ADD shared invoice-number proposal helper

- **IMPLEMENT**: Add `createInvoiceNumberProposal(settings: Pick<Settings, 'invoicePrefix' | 'invoiceYear' | 'nextSequence'>): string` (or a comparably clear typed signature) in `src/shared/invoice/numbering.ts`. Preserve the exact current formatting expression and do not validate settings here; settings validation remains at its existing boundary.
- **PATTERN**: Pure shared invoice functions live in `src/shared/invoice/`; see `dates.ts` and `money.ts`.
- **IMPORTS**: `import type { Settings } from '../domain/settings'` or a narrowly typed `Pick`.
- **GOTCHA**: Sequence `0` is currently valid under settings validation and formats as `000`; do not silently change it. Keep leading zero behavior for values below 1000 and do not truncate larger values.
- **VALIDATE**: `npx vitest run tests/unit/invoiceNumbering.test.ts`.

### Task 2 — CREATE proposal formatter unit tests

- **IMPLEMENT**: Cover standard values (`RE-2026-001`), sequence padding (`7` → `007`, `99` → `099`), sequence `0`, values above three digits (not truncated), and empty/custom prefixes or years as accepted by the existing settings type.
- **PATTERN**: Follow concise Vitest `describe`/`it`/`expect` style in `tests/unit/issueValidation.test.ts` and `tests/unit/money.test.ts`.
- **GOTCHA**: Tests must specify current string-concatenation behavior, not introduce new prefix/year normalization rules.
- **VALIDATE**: `npx vitest run tests/unit/invoiceNumbering.test.ts`.

### Task 3 — UPDATE draft creation and settings reconciliation

- **IMPLEMENT**: Use the shared helper in `createDraft` and `App.replaceInvoice`. In `useInvoiceDraft`, reconcile `draft.suggestedNumber` to the current proposal after a draft has loaded and whenever the derived proposal changes. Use functional state updates and skip `setDraft` when already equal. Do not run reconciliation before settings are ready or against an uninitialized draft. A changed proposal replaces a manual value as required by the feature brief.
- **PATTERN**: Draft creation and rotation are in `src/renderer/hooks/useInvoiceDraft.ts`; replacement creation is in `src/renderer/App.tsx`.
- **IMPORTS**: Import the shared formatter in both renderer files.
- **GOTCHA**: React Strict Mode may run effects more than once; reconciliation must be idempotent. Do not depend on the whole Settings object if that would reset a manually entered value after unrelated settings changes; depend on the derived proposal or the three relevant settings fields. Ensure a restored draft is reconciled before it becomes the stable displayed/autosaved value, and avoid stale closure overwrites.
- **VALIDATE**: `npm run typecheck && npx vitest run tests/unit/invoiceNumbering.test.ts tests/integration/draftStore.test.ts`.

### Task 4 — UPDATE InvoiceWorkspace to one controlled number input

- **IMPLEMENT**: Remove `numberOverride` local state and its draft-ID reset effect. Remove the read-only “Suggested invoice number” control. Replace the separate override input with one labeled “Invoice number” input controlled by `draft.suggestedNumber`; update the draft through `onChange`. Add a labeled, accessible Revert button that uses the latest proposal. Keep `maxLength=80`, the issue validation relationship, and first-invalid focus. If the proposed number is blank while settings are incomplete, display and validate it without adding new formatting rules.
- **PATTERN**: Controlled draft fields use `onChange({ field: event.target.value })`; accessible field errors use `aria-invalid` and `aria-describedby` in this component.
- **GOTCHA**: Preserve keyboard operation and focus mapping from the invoice preview; give the input and `PreviewTarget` a shared, stable ID such as `invoice-number`. Keep print-only rendering free of editor controls.
- **VALIDATE**: `npm run typecheck && npm run lint`.

### Task 5 — UPDATE preview, validation, and issue wiring to share the draft value

- **IMPLEMENT**: Call `validateIssueDraft(draft)` or pass `draft.suggestedNumber`; render the preview and QR-bill preview from `draft.suggestedNumber`; align the preview target with the renamed number input. Change `InvoiceWorkspace`’s issue callback and `App.issueInvoice` so they submit the current draft without a second local number value. Do not pass an empty override that could select a different source. Keep main-process validation authoritative and keep any optional IPC/service override only for compatibility.
- **PATTERN**: `issueValidation.ts` already defaults to `draft.suggestedNumber`; `InvoiceIssuanceService.issue` selects that field when no override is supplied. QR preview already accepts a number prop.
- **GOTCHA**: The print route builds an `InvoiceDraft` from the issued snapshot; keep that number equal to the immutable `invoiceNumber`. Successful issue rotates using the settings returned after sequence advancement.
- **VALIDATE**: `npm run typecheck && npx vitest run tests/unit/issueValidation.test.ts tests/unit/qrBillData.test.ts tests/integration/invoiceArchiveStore.test.ts`.

### Task 6 — UPDATE draft persistence coverage and complete validation

- **IMPLEMENT**: Extend the draft persistence test to round-trip a manually edited `suggestedNumber` without altering other fields. Perform the manual scenarios below and run the complete project check set.
- **PATTERN**: `tests/integration/draftStore.test.ts` creates an isolated temporary data directory and verifies the persisted draft round trip.
- **GOTCHA**: No storage version bump or migration is expected because the existing field already stores a string and remains present.
- **VALIDATE**: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run smoke`.

---

## TESTING STRATEGY

### Unit Tests

- Test proposal formatting for standard, padded, zero, large, and custom values.
- Retain validation tests that confirm the default selected number is validated and unsafe number values are rejected.
- If proposal reconciliation is extracted into a pure helper, test that it preserves the draft when proposal is unchanged, replaces it when proposal changes (including a manual value), and leaves all non-number draft fields intact. Do not add an abstraction solely to test a trivial React effect.

### Integration Tests

- Extend draft-store round-trip coverage to confirm a user-edited number survives save/load.
- Confirm no IPC or persisted schema migration is introduced.
- Existing issuance/archive tests remain required regression checks. The main-process service must archive the same `draft.suggestedNumber` shown in the renderer when no legacy override is supplied.

### Manual Electron Scenarios

1. Open a new draft and confirm one invoice-number input contains the configured proposal; there is no second read-only number field or blank override.
2. Edit the number and confirm the invoice preview and QR-bill payment message update immediately.
3. Confirm Revert restores the current proposal, and is unavailable/inert when the value already equals it.
4. Save/allow autosave, restart or reload the app, and confirm the edited value is restored.
5. Change prefix, year, then sequence in Settings and save; each new proposal replaces a manual value in the draft and preview. Verify unrelated settings changes do not reset a manual value.
6. Change the proposal while a saved draft exists, navigate back to the invoice, and confirm the proposal is current before issue.
7. Issue a valid invoice and confirm the preview number, issued confirmation, archive record, PDF invoice number, and QR-bill message agree; confirm the next draft uses the incremented proposal.
8. Prepare a replacement from Archive and confirm it starts with the current proposal.
9. Keyboard-navigate to Revert and activate it; activate the preview number and confirm it focuses the editable invoice-number input.

### Edge Cases

- Saved draft contains a manually selected number; configured proposal has not changed: preserve the manual value.
- Saved draft contains a manual value; prefix/year/sequence changes: replace it with the latest proposal.
- Unrelated settings such as appearance, company details, currency, or payment term change: preserve the current manual invoice number.
- Settings proposal changes more than once before autosave completes: latest proposal wins; no stale effect restores an earlier value.
- Restored draft proposal differs from current settings: reconcile to current settings.
- Prefix/year contain strings allowed by existing settings validation; preserve current formatting exactly.
- Sequence is zero or exceeds 999; preserve `padStart(3, '0')` semantics.
- Draft rotation after successful issue uses updated settings; replacement draft uses current settings.
- Invalid number remains visible, receives existing validation feedback, and is rejected by main-process validation without advancing the sequence.
- Print-only route renders the immutable issued number and does not show Revert or editable fields.

---

## VALIDATION COMMANDS

Run from the repository root after implementation.

### Level 1: Type and style

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

### Level 2: Focused tests

- `npx vitest run tests/unit/invoiceNumbering.test.ts tests/unit/issueValidation.test.ts tests/integration/draftStore.test.ts`

### Level 3: Full automated checks

- `npm test`
- `npm run build`
- `npm run smoke`

### Level 4: Manual validation

- Follow all nine Manual Electron Scenarios above. Specifically compare invoice preview, issued archive entry, PDF invoice number, and QR-bill message for exact equality.

---

## ACCEPTANCE CRITERIA

- [ ] Exactly one editable invoice-number field is present in the editor, initialized from the configured proposal.
- [ ] The existing draft field stores edits and autosaves them; old saved drafts remain readable without migration.
- [ ] Revert restores the latest current proposal and is accessible by keyboard and assistive technology.
- [ ] Prefix, year, or sequence proposal changes replace the field value even when it held a manual override; unrelated settings changes preserve manual edits.
- [ ] Restored drafts reconcile to the current proposal when relevant settings changed since save.
- [ ] Preview number, QR-bill message, issue validation, issue request, and archived invoice use one current draft number.
- [ ] Main-process validation, duplicate detection, sequence advancement, and immutable issued records retain current behavior.
- [ ] Replacement and post-issue drafts use the current settings-derived proposal.
- [ ] Focus mapping and print-only rendering continue to work.
- [ ] Focused and full checks pass, and the manual scenarios complete without discrepancies.

## COMPLETION CHECKLIST

- [ ] Shared proposal formatter and focused unit tests are complete.
- [ ] Draft initialization, replacement, settings reconciliation, and restoration behavior are complete.
- [ ] The single controlled field, Revert, preview mapping, and issue path are complete.
- [ ] Draft persistence and issue/archive parity are verified.
- [ ] Typecheck, lint, format check, all tests, build, and smoke checks pass.
- [ ] Manual Electron scenarios pass.
- [ ] `.agents/plans/invoice-editor-ux-prd.md` Phase 1 checkboxes/status are updated only after its criteria are actually implemented and verified.

## NOTES

- Keep `InvoiceDraft.suggestedNumber` and the version-1 persisted draft schema for this phase. Renaming it to `invoiceNumber` would require a deliberate compatibility migration and is not part of the feature brief.
- The service and IPC layer currently support `numberOverride`. Leave that optional path compatible; remove the renderer's parallel override state so ordinary issuance uses `draft.suggestedNumber`.
- The invoice settings form updates renderer settings state while the user edits and persists it on Save. Reconcile the draft when the effective prefix/year/sequence proposal passed to `useInvoiceDraft` changes, as required by the feature brief; unrelated settings edits must not reset the number. Saving settings remains the existing persistence behavior.
- **Confidence:** 8/10. The relevant code paths and persistence behavior are direct. The main implementation risk is coordinating edited Settings state, draft restoration, and debounced draft autosave without resetting a number for unrelated settings changes.
