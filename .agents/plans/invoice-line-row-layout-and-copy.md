# Feature: Fit Invoice Line Items and Copy the Previous Row

This plan addresses the invoice editor's service-row layout and add-row behavior. Validate the implementation against the actual desktop window sizes before settling final column widths.

## Feature Description

Keep each service line's description, hours, rate, calculated amount, and remove action aligned in one compact horizontal row within the invoice editor. Prevent the table from forcing the user to scroll horizontally to reach inputs or the remove action. When adding a row, copy the previous row's editable values while assigning the new row its own stable ID. If the draft has no rows, create the existing blank row.

## User Story

As a person preparing an invoice,
I want service row controls to fit together on one line and new rows to start from the preceding row,
so that I can enter repeated work without scrolling or retyping common values.

## Problem Statement

`InvoiceWorkspace` renders five table columns inside `.table-scroll`. The editor shares the workspace grid with the preview, and its table cells and global button minimum height/padding can force the controls to overflow or wrap. Adding a row in `useInvoiceDraft` always creates empty description, hours, and rate fields, even when the previous line already has reusable values.

## Solution Statement

Give the editor's line-item controls an explicit compact layout with a flexible description column and bounded numeric, amount, and action columns. Ensure inputs can shrink within their grid/table cells and keep the remove action compact and on one line. Adjust the invoice workspace breakpoint if needed so the editor has adequate width on common desktop windows. In `addLine`, clone the last line's editable values (description, hours, rate) and generate a new UUID; when no previous line exists, retain blank defaults. Do not copy the existing ID.

## Feature Metadata

**Feature Type**: Enhancement / UI bug fix  
**Estimated Complexity**: Low  
**Primary Systems Affected**: Invoice editor component, renderer styles, invoice draft hook  
**Dependencies**: None; existing React, TypeScript, and CSS only

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: READ BEFORE IMPLEMENTING

- `src/renderer/components/InvoiceWorkspace.tsx:108-201` - Service table, editable fields, amount display, row removal, and add-row button.
- `src/renderer/hooks/useInvoiceDraft.ts:58-70` - Draft update and current blank-row creation logic.
- `src/shared/domain/invoice.ts:5-12` - `InvoiceLineItem` shape; ID plus editable description, hours, and rate values.
- `src/renderer/styles/global.css:11-24` - Global button minimum height and padding contributing to row height and width.
- `src/renderer/styles/global.css:129-139` - Existing full-width input styles.
- `src/renderer/styles/global.css:171-195` - Generic table sizing, cell padding, and table-scroll overflow behavior.
- `src/renderer/styles/global.css:251-265` and `326-356` - Two-column invoice workspace and current 680px responsive breakpoint.
- `tests/unit/invoiceValidation.test.ts` - Existing Vitest style; it tests validation rather than renderer behavior.
- `package.json` - Available validation scripts and dependencies. No component-testing library is currently declared.
- `.agents/AGENTS.md` - Architecture and data rules: keep structured invoice data as source of truth and preserve stable line IDs.
- `.agents/reference/components.md` - Renderer component and accessibility conventions.

### New Files to Create

- No new files expected. If adding a pure line-cloning helper for isolated testing, keep it near `useInvoiceDraft.ts` or in a small shared invoice utility only if it is genuinely reusable.

### Relevant Documentation

- No external documentation is needed. This change uses existing React state patterns and CSS already in the repository.

### Patterns to Follow

**Naming and state:** Use `InvoiceLineItem` and existing `crypto.randomUUID()` convention. Change the line list through `update({ lines: [...] })`, preserving the current autosave flow.

**Row cloning:**

```ts
const previous = draft?.lines.at(-1);
const line: InvoiceLineItem = {
  id: crypto.randomUUID(),
  description: previous?.description ?? '',
  hours: previous?.hours ?? '',
  rate: previous?.rate ?? '',
};
```

The exact implementation may use a different equivalent syntax if required by configured TypeScript target. Do not spread the previous row without overriding `id`.

**Styling:** Scope new rules to the invoice editor/service rows rather than changing generic tables used by customer screens. Use `min-width: 0` on shrinkable cells/inputs; retain visible focus styling and a usable remove button hit area while reducing excess padding/min-height for the row action.

**Accessibility:** Preserve accessible input names and the remove button's `aria-label`. If the visible remove text is replaced with an icon, supply an equivalent accessible name and ensure focus visibility; keeping a concise “Remove” label is preferred.

---

## IMPLEMENTATION PLAN

### Phase 1: Compact row layout

- Scope line-item styling to the invoice editor.
- Use fixed/bounded space for hours, rate, amount, and remove action; allow description to consume remaining width.
- Prevent inputs and action text from expanding columns or wrapping into a taller row.
- Revisit the invoice workspace breakpoint so the editor receives enough width at typical desktop window sizes. Keep all controls in the same row at supported sizes; at very narrow widths, prioritize usable minimum control widths and document any unavoidable overflow decision.

### Phase 2: Copy-last-row behavior

- In `useInvoiceDraft.addLine`, derive the new row's description, hours, and rate from the current last line.
- Assign a new UUID every time. Keep the existing empty-row defaults when the list is empty.
- Preserve order, calculation behavior, and debounced draft persistence.

### Phase 3: Validation

- Verify the editor layout visually at a normal desktop window and a narrower window, including that no horizontal scrolling is needed to reach any line input/action and that each row stays on one line.
- Verify add-row behavior for an empty list and for a populated list, including unique IDs and copied values.
- Run relevant project checks as directed by the implementation task.

---

## STEP-BY-STEP TASKS

### Task 1: UPDATE `src/renderer/styles/global.css`

- **IMPLEMENT**: Add narrowly scoped service-row styles. Prefer a grid/fixed table layout with a flexible description track and compact bounded tracks for hours, rate, amount, and action; set shrink behavior for inputs; make the remove button compact and keep its label unwrapped. Reduce row cell padding only within this table.
- **PATTERN**: Existing table and input rules at `global.css:129-139`, `171-195`; workspace grid and responsive breakpoint at `251-265`, `326-356`.
- **GOTCHA**: Generic `button` rules set `min-height: 42px` and horizontal padding (`16-24`). Override only the line remove action. Generic `.table-scroll` currently enables overflow; ensure the service row itself fits at target viewport widths instead of masking it with a scrollbar.
- **VALIDATE**: `npm run format:check` and manual renderer inspection.

### Task 2: UPDATE `src/renderer/components/InvoiceWorkspace.tsx`

- **IMPLEMENT**: Add class names to the service table, header/cells, inputs, and action button as needed to support scoped layout. Preserve data editing, amount calculation, remove behavior, and accessible labels.
- **PATTERN**: Component's existing controlled inputs and stable `key={line.id}` at `InvoiceWorkspace.tsx:121-193`.
- **GOTCHA**: Do not alter the preview table styles or global customer table layout. Keep calculated amount display-only.
- **VALIDATE**: `npm run typecheck` and `npm run lint`.

### Task 3: UPDATE `src/renderer/styles/global.css` responsive workspace rules

- **IMPLEMENT**: Adjust the workspace single-column breakpoint if measurements show the editor's half-width cannot accommodate the row. Check that normal desktop widths keep the preview usable and the service controls do not overflow.
- **PATTERN**: Existing `.invoice-workspace` grid at `global.css:251-255` and media query at `326-356`.
- **GOTCHA**: The breakpoint must account for `main` width, panel padding, and column gap, not only viewport width. Preserve mobile single-column behavior.
- **VALIDATE**: Manual inspection at representative window widths; verify all five controls/values stay horizontally aligned.

### Task 4: UPDATE `src/renderer/hooks/useInvoiceDraft.ts`

- **IMPLEMENT**: Make `addLine` copy editable values from the last line, or use empty strings when there is no previous line. Always generate a fresh `crypto.randomUUID()` for the appended line.
- **PATTERN**: Existing `InvoiceLineItem` creation and `update` call at `useInvoiceDraft.ts:58-68`.
- **GOTCHA**: Do not copy the prior ID; preserve unfinished string values exactly (including temporarily invalid numeric input), and do not clone invoice-level or customer fields.
- **VALIDATE**: `npm run typecheck`; verify empty and populated draft cases through the UI or a focused hook test if the implementation adds suitable test infrastructure.

### Task 5: VERIFY the invoice editor behavior

- **IMPLEMENT**: Confirm a newly added row copies the immediately preceding row's three editable values, can be edited independently, and saves through existing autosave. Confirm adding to zero rows creates an empty line.
- **PATTERN**: Existing autosave in `useInvoiceDraft.ts:49-57` and calculations from structured line data in `InvoiceWorkspace.tsx:121-123`.
- **GOTCHA**: Two rows must have distinct stable IDs so React does not reuse the first row's controls.
- **VALIDATE**: `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test`; manually inspect the desktop UI at wide and narrow widths.

---

## TESTING STRATEGY

### Unit or component tests

- If the implementation isolates line creation into a pure helper, test copying the previous description/hours/rate, generating a distinct ID, preserving empty strings from an unfinished prior row, and blank defaults for an empty list.
- The repository currently has Vitest but no declared React Testing Library or hook-test package. Avoid adding a new dependency for this small behavior; a minimal pure helper test or focused manual verification is sufficient unless suitable test utilities already exist.

### Manual UI checks

- Open Invoice, add several lines, and verify each row shows description, hours, rate, amount, and Remove on one horizontal line.
- Verify no horizontal scroll is required to reach fields/action at typical desktop window width; inspect a narrower window and ensure the workspace collapses early enough to keep inputs usable.
- Add a second row and check its values match the first. Edit the second row and confirm the first stays unchanged and both amounts recalculate independently.
- Add a row to an empty draft and confirm all editable values start blank.
- Reload after autosave and confirm both rows restore independently.

### Edge Cases

- No existing lines: create a blank row.
- Previous row contains empty or partially typed hours/rate: copy the raw strings without normalizing them.
- Several sequential adds: each new row copies the row directly above it and receives a unique ID.
- Very long description: description column shrinks without expanding the overall row; text remains editable and does not push numeric/action columns off-screen.
- Narrow viewport: preserve one-line row alignment where controls remain usable; workspace may stack editor and preview sooner.

---

## VALIDATION COMMANDS

### Level 1: Type, lint, and formatting

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

### Level 2: Automated tests

- `npm test`

### Level 3: Manual validation

- `npm run dev`, open the Invoice page, and perform the checks listed above at wide and narrow window sizes.

---

## ACCEPTANCE CRITERIA

- [ ] Description, hours, rate, calculated amount, and remove action fit in one horizontal service row at normal desktop window widths.
- [ ] The user does not need to horizontally scroll the service table to reach any input or the remove action at normal desktop window widths.
- [ ] The remove action stays a compact, single-line control and does not make each row unnecessarily tall.
- [ ] Adding a row copies the immediately previous line's description, hours, and rate exactly.
- [ ] Every added row has a new unique ID; editing a copied row does not change its source row.
- [ ] Adding a first row to an empty invoice creates blank editable values.
- [ ] Amount calculations, row removal, and draft autosave/restore continue to work.
- [ ] Typecheck, lint, formatting, and test commands pass; manual layout checks are complete.

---

## COMPLETION CHECKLIST

- [ ] Scoped layout styles and component class names are implemented.
- [ ] Responsive workspace width is checked at useful window sizes.
- [ ] Copy-last-row logic assigns fresh IDs and handles the empty list.
- [ ] Automated and manual validation is complete.
- [ ] Acceptance criteria are met.

## NOTES

- Keep scope limited to editor usability and row creation. Do not change invoice preview layout, line-item domain shape, validation rules, or numbering behavior.
- **Confidence score: 9/10.** The relevant UI and draft logic are localized. Exact CSS column widths and the best workspace breakpoint need a quick visual check in the running desktop app.
