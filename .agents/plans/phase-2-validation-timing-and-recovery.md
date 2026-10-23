# Feature: Phase 2 — Validation Timing and Recovery

This plan covers Phase 2 of [Invoice Editor UX Improvements](invoice-editor-ux-prd.md). Validate each requirement against the current implementation before editing: Git history shows that live issue validation feedback was partially introduced earlier, but the current renderer still exposes errors before an issue attempt and does not create a service row after an empty-draft attempt.

## Feature Description

Make issue validation useful at the point the user needs it. Keep an untouched draft visually calm; when the user confirms an issue attempt, validate the draft in the renderer, preserve all entered values, reveal actionable errors, and focus the first relevant editor control. If the draft has no service rows, create exactly one blank row and show its row-level validation feedback without invoking issuance. Once the user has attempted issuance, keep displayed errors synchronized with edits. Retain main-process validation as the final safeguard before any issuance side effects.

## User Story

As a user preparing an invoice,
I want issue-specific validation to appear when I try to issue and point me to the first correction,
so that I can complete an invoice without premature warnings or losing draft data.

## Problem Statement

`InvoiceWorkspace` currently derives and renders `validateIssueDraft(draft).issues` on every render. This means an incomplete draft can show errors before the user has tried to issue it. The issue action currently calls the main-process IPC path directly. If there are no service rows, the backend rejects the invoice but the UI does not add a row. Existing field-level errors cover several controls, but there is no concise form-level summary and line-level errors can render inside narrow table cells. First-error focus is only wired to errors returned by the main process, and its mapping does not cover every issue field.

Git history includes commit `3f7fa4f` (`feat: add live invoice validation feedback`), which introduced renderer-side live feedback, settings navigation, focus mapping, and server issue display. Treat that commit as prior work to refine, not as evidence that this phase's timing and recovery requirements are complete. The user's direction is that Phase 2 is the next phase.

## Solution Statement

Use the existing shared `validateIssueDraft` function for renderer preflight and retain the same main-process validation. Track whether the user has attempted issuance. Before the first attempt, hide issue-specific errors. On the confirmed action, mark the attempt, ensure at least one row exists, and validate locally. If invalid, do not call IPC; reveal current errors and focus the first relevant control after React has rendered the error state or newly added row. After the first attempt, recompute errors from the current draft on every edit. On a valid attempt, continue through the existing IPC flow, preserve backend validation, and surface any server issues through the same accessible feedback model.

Keep field messages associated with controls using `aria-invalid` and `aria-describedby`. Add a concise issue summary, and render service-row errors in a full-width row region rather than relying on narrow numeric cells. Settings-owned sender errors should retain the existing Open Settings action. Do not change issuance transaction, number advancement, PDF, archive, or draft-persistence behavior.

## Feature Metadata

**Feature Type**: Enhancement / Bug Fix  
**Estimated Complexity**: Medium  
**Primary Systems Affected**: Renderer invoice workspace, renderer issue orchestration, issue validation display, renderer styling, validation tests  
**Dependencies**: Existing React 18, TypeScript, Vitest, and shared issue-validation module; no new runtime dependency

---

## CONTEXT REFERENCES

### Relevant Codebase Files — Read Before Implementing

- `src/renderer/components/InvoiceWorkspace.tsx:63-109` — Current issue computation, server issue combination, field lookup, and focus mapping. Gate current issue feedback and extend focus to client-side attempts.
- `src/renderer/components/InvoiceWorkspace.tsx:205-253` — Current summary area and issue action. Add attempt-aware summary and ensure local preflight can stop invalid issuance.
- `src/renderer/components/InvoiceWorkspace.tsx:254-508` — Customer, number, date, and service row error associations. Preserve IDs and ARIA behavior while relocating row errors.
- `src/renderer/App.tsx:196-211` — Existing issue IPC orchestration and server error handling. Keep this path for valid renderer preflight results and retain its main-process error handling.
- `src/renderer/App.tsx:298-312` — Props passed to `InvoiceWorkspace`, including draft update, add-row, issue callback, and backend issue errors.
- `src/renderer/hooks/useInvoiceDraft.ts:155-163` — Blank service row creation and draft update behavior. Reuse `addLine`; do not duplicate line initialization.
- `src/shared/invoice/issueValidation.ts:43-198` — Pure authoritative issue validation and field-key conventions. Keep it the single source for renderer preflight and main-process validation.
- `src/main/services/invoiceIssuanceService.ts:53-69` — Main-process draft identity and validation gate before issuance side effects. Preserve this final check.
- `src/renderer/styles/global.css:140-190` — Existing field error and invalid-control styling. Extend for the summary and row-wide feedback using current theme tokens.
- `tests/unit/issueValidation.test.ts` — Existing Vitest style and valid/invalid draft fixtures.
- `.agents/reference/components.md` — Renderer component and accessibility conventions.
- `.agents/reference/invoice-domain.md` — Invoice model and validation conventions.
- `.agents/AGENTS.md` — Security, architecture, validation, and workflow constraints.

### New Files to Create

- None expected. Keep the phase within the existing invoice editor and validation structure unless implementation reveals a clear need to extract a small pure helper for testability.

### Relevant Documentation

- No external documentation or new library research is required. The feature uses existing React, ARIA relationships, and the project's current validation APIs. Follow repository guidance and the referenced component/domain notes.

### Patterns to Follow

**Validation:** `validateIssueDraft` is pure and returns `{ valid, issues, totalCents, lineTotalsCents }`. Keep validation deterministic and reuse it in renderer preflight and the main process.

**Renderer state:** `useInvoiceDraft.update` and `addLine` own draft updates. Use the existing callback instead of mutating draft data inside the view.

**Error associations:** Existing controls use stable IDs, `aria-invalid`, and `aria-describedby`; preserve those associations. Summary and row-level messages must be readable without relying on color alone.

**Backend boundary:** `App.issueInvoice` invokes the typed preload API; the main process validates IPC payloads and `InvoiceIssuanceService` validates before advancing numbering or writing the archive. Do not remove either boundary check.

**Avoid:** Showing all issue errors on initial load; invoking `window.invoicing.issueInvoice` for an invalid client-side draft; rendering long row messages inside narrow hours/rate cells; focusing a stale server error after the field has been corrected; adding renderer filesystem access or a new IPC route.

---

## IMPLEMENTATION PLAN

### Phase 1: Attempt-aware preflight and empty-row recovery

- Track whether issue validation has been requested for the active draft. Reset that state when the draft ID changes or a new draft is issued/restored.
- On the confirmed issue action, mark the attempt and ensure an empty draft gets exactly one row by calling the existing `onAddLine` path. Do not issue in this case.
- For drafts with rows, run `validateIssueDraft` before calling `onIssue`. If invalid, retain draft values, reveal the issues, and do not call IPC. If valid, continue through the current issue flow.
- After the first attempt, recompute visible issues as the draft changes so corrected controls clear promptly and remaining errors stay current.
- Keep the main-process validation unchanged and authoritative.

### Phase 2: Accessible recovery feedback

- Add a concise issue summary when an attempted draft is invalid, including a clear indication of the number of problems and useful field/row context.
- Continue associating individual errors with relevant controls. Map first-error focus from the issue field key to the corresponding input after the attempted state and any new row are committed.
- Render row-level errors in a full-width region associated with the row. Route amount/total errors to a clear form-level message and direct users to relevant service fields.
- Keep sender/company issues visible with a working Open Settings action; avoid attempting to focus a control that only exists on another page.
- Keep backend-originated issue details visible after IPC failure and avoid stale duplicate messages when the current draft no longer has the corresponding issue.

### Phase 3: Regression coverage and workflow verification

- Extend issue validation or add focused tests for the fields/edge cases uncovered during implementation. Reuse existing fixture patterns and avoid a new UI testing dependency unless the repository already supports it.
- Verify the renderer attempt gate, empty-row path, focus, correction, and backend rejection behavior in the Electron UI.
- Run the project's type, lint, format, unit/integration, build, and smoke checks.

---

## STEP-BY-STEP TASKS

### Task 1: UPDATE `src/renderer/components/InvoiceWorkspace.tsx`

- **IMPLEMENT**: Add attempt-aware validation display. Before an issue attempt, suppress `currentIssues`; after an attempt, derive them from the latest draft. Reset attempt state when the active draft changes.
- **IMPLEMENT**: On the confirmed Issue invoice action, if there are no service rows, invoke `onAddLine` exactly once and stop. Otherwise validate locally; call `onIssue` only when valid.
- **IMPLEMENT**: After an invalid attempt, reveal current issues and focus the first matching input after the DOM reflects state. Include customer, invoice number, invoice/due dates, and service description/hours paths in the mapping. For company-owned fields, use the existing Settings navigation affordance.
- **PATTERN**: Existing `issueFor`, `lineIssue`, `issueIssues`, `onAddLine`, and `onIssue` props in this component.
- **GOTCHA**: React state updates are asynchronous. Do not validate the stale zero-row draft after calling `onAddLine`; the empty-row attempt should stop before issuance and focus the inserted row after render.
- **VALIDATE**: `npm run typecheck`

### Task 2: UPDATE `src/renderer/components/InvoiceWorkspace.tsx` and `src/renderer/styles/global.css`

- **IMPLEMENT**: Add a concise validation summary shown only after an issue attempt with current errors. Retain field-specific messages and ARIA IDs.
- **IMPLEMENT**: Move service row issue messages into a full-width, row-associated region; avoid long messages inside narrow table cells. Keep line and total issues understandable and point users to the service section.
- **PATTERN**: Existing `.field-error`, invalid input styles, and CSS custom properties in `global.css`.
- **GOTCHA**: Preserve table semantics and accessible control descriptions; do not announce the same error through multiple competing alerts.
- **VALIDATE**: `npm run lint && npm run format:check`

### Task 3: UPDATE issue orchestration only if needed in `src/renderer/App.tsx`

- **IMPLEMENT**: Keep existing IPC submission for locally valid drafts. Keep backend issue errors and generic failures visible. Only add parent-level attempt state if needed to reset the view consistently across draft rotation/replacement; otherwise keep presentation state local to the workspace.
- **PATTERN**: `issueInvoice` and `serverIssues` state at lines 86-87 and 196-211.
- **GOTCHA**: Never invoke IPC on the zero-row recovery path or any renderer-invalid draft. Do not alter transaction IDs, replacement invoice behavior, or success flow.
- **VALIDATE**: `npm run typecheck`

### Task 4: UPDATE `tests/unit/issueValidation.test.ts` and add tests only for new pure logic

- **IMPLEMENT**: Cover empty row set, blank/partial row, invalid amount, zero/invalid total, malformed dates, sender/customer errors, invoice-number errors, and a valid invoice. If attempt behavior is extracted into a pure helper, test that invalid/empty attempts do not authorize submission and that valid attempts do.
- **PATTERN**: Existing valid `draft` fixture and `validateIssueDraft` assertions.
- **GOTCHA**: Avoid testing React DOM behavior in this node-only suite without an existing renderer harness. Cover focus, timing, and ARIA behavior in the manual Electron workflow.
- **VALIDATE**: `npm test -- tests/unit/issueValidation.test.ts`

### Task 5: VERIFY the end-to-end issue recovery workflow

- **IMPLEMENT**: No product changes unless a discrepancy is found; record the acceptance checks as complete only after verification.
- **VALIDATE**: Run the validation commands below, then verify with the desktop app: initial incomplete draft has no issue errors; issue with zero rows adds one blank row and does not call issuance; invalid populated draft retains values, shows summary and associated errors, and focuses first invalid input; fixing fields clears messages; valid draft enters existing issuance flow; a backend-only rejection remains understandable; number/archive side effects do not occur on invalid attempts.

---

## TESTING STRATEGY

### Unit Tests

- Keep `validateIssueDraft` tests deterministic and cover field-key mappings relied on by focus/error display.
- If a small pure attempt helper is introduced, cover the empty-row and valid/invalid submission decisions without React or Electron dependencies.

### Integration Tests

- No main-process issuance contract changes are expected. Existing `tests/integration/ipcValidation.test.ts` and archive/issuance coverage should continue to pass.
- Do not add tests that produce a real PDF unless the existing test fixture/service patterns require them.

### Edge Cases

- Untouched draft: no issue-specific validation appears.
- User cancels the permanent-issue confirmation: no validation attempt or row insertion occurs.
- Empty draft: exactly one row is inserted, issue is blocked, and focus reaches a useful control in that row.
- Partial row, invalid hours/rate, and zero total: values remain intact and errors map to useful controls.
- Multiple errors: summary is concise; focus goes to the first issue in deterministic validation order.
- Corrections after first attempt: fixed errors disappear, unresolved errors remain, and focus is not repeatedly stolen on each keystroke.
- Settings-owned sender issue: user can navigate to Settings; no misleading focus attempt occurs in the invoice page.
- Backend duplicate-number, missing archive folder, and draft-changed errors remain surfaced even when they are not represented as ordinary draft field errors.
- Main-process invalid invoice: no number advancement, PDF, or archive record is produced.

---

## VALIDATION COMMANDS

### Level 1: Syntax and Style

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

### Level 2: Tests

- `npm test -- tests/unit/issueValidation.test.ts`
- `npm test`

### Level 3: Build and Launch

- `npm run build`
- `npm run smoke`

### Level 4: Manual Electron Validation

- Open a new incomplete invoice and confirm no issue errors appear before the first attempt.
- Attempt issuance with no rows, confirm one blank row appears, its first actionable control receives focus, and no issuance/loading/success flow starts.
- Attempt with a partial row and multiple missing identity/date/payment fields; confirm summary, field associations, first focus, and preserved values.
- Correct individual errors and confirm messages clear without focus jumping on each edit.
- Confirm company validation offers Open Settings and returns to an editable screen.
- Complete a valid draft and confirm normal issuance still succeeds.
- Trigger duplicate-number and missing-archive-folder failures; confirm understandable feedback and no incorrect field error is left behind.

---

## ACCEPTANCE CRITERIA

- [ ] No issue-specific errors appear until an issue attempt is confirmed.
- [ ] A zero-row issue attempt inserts exactly one blank row, shows actionable feedback, and does not invoke issuance or advance the number.
- [ ] Invalid populated drafts retain their values, show a concise summary, expose associated errors, and focus the first invalid invoice control.
- [ ] Row errors use a dedicated full-width row area; amount/total errors clearly direct the user to service fields.
- [ ] After the first attempt, error state reflects edits and corrected fields clear without stealing focus repeatedly.
- [ ] Settings-owned errors provide usable navigation and do not attempt to focus an off-page field.
- [ ] Main-process validation remains authoritative before any number advancement, PDF write, or archive commit.
- [ ] Duplicate-number, archive-folder, draft-changed, and other backend failures remain understandable.
- [ ] Typecheck, lint, formatting, tests, build, and smoke checks pass.

---

## COMPLETION CHECKLIST

- [ ] Attempt gate and empty-row recovery implemented.
- [ ] Accessible summary, field associations, row-wide feedback, and deterministic first-error focus implemented.
- [ ] Existing IPC and main-process safety checks preserved.
- [ ] Automated checks and manual Electron recovery workflow pass.
- [ ] Phase 2 status in `invoice-editor-ux-prd.md` is updated only after acceptance criteria are met.

## NOTES

- This plan is limited to Phase 2. Responsive page fit and the persistent issue bar belong to Phase 3; CSV control consolidation belongs to Phase 4; per-row service dates belong to Phase 5.
- Repository history shows substantial prior validation work (`3f7fa4f`), but the current code contradicts the UX brief's goal of deferring errors. Implement the missing attempt timing and recovery behavior without rebuilding the existing validator or weakening backend validation.
- **Confidence Score**: 8/10. The domain validator and UI error scaffolding already exist; uncertainty is concentrated in cleanly coordinating attempt state, blank-row insertion, and post-render focus within the current renderer-only test setup.
