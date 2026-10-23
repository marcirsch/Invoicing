# Feature: Phase 3 — Preview Fit and Issue Action

This plan implements Phase 3 of [Invoice Editor UX Improvements](invoice-editor-ux-prd.md). Validate each requirement against the current UI before editing. Keep the invoice's A4 geometry and pagination independent from screen scaling, and keep the issue action attached to the editor without covering content or keyboard focus.

## Feature Description

Fit each on-screen invoice and QR-bill page to the width available in the preview pane, preserving its A4 proportions and allowing vertical scrolling through multiple pages. Keep a clearly labeled Issue invoice action persistently available beside the editor, with the current invoice number and calculated total. At short viewport heights and high zoom, allow the action bar to return to normal document flow so it cannot conceal fields or focus.

This is screen presentation work. The shared invoice model, measured pagination, Chromium print output, issue validation, confirmation, transaction handling, and archived output remain authoritative and unchanged.

## User Story

As a user preparing an invoice in a small or standard window,
I want the preview to fit its pane and the issue action to stay near the editor,
so that I can review the document and issue it without horizontal scrolling or searching through the form.

## Problem Statement

The current preview uses responsive page widths and media-query layouts, but it does not maintain a distinct fixed A4 page layout that is scaled as a whole to the preview pane. The `ResizeObserver` in `InvoiceWorkspace` measures page and row geometry for pagination; tying those measurements to a display transform could change line placement or create feedback loops. The Issue invoice button currently sits near the top of the editor form, so it scrolls out of view while the user edits lower fields. A sticky action also needs to adapt when the available height shrinks or zoom increases.

## Solution Statement

Measure the preview pane with `ResizeObserver` and derive a screen scale from the pane's usable width and the A4 page width, clamped to at most `1`. Render each page at stable A4 layout dimensions, then apply the scale only to an interactive preview wrapper whose reserved layout dimensions account for the scaled page and gaps. Keep pagination capacity and row-height inputs in unscaled page coordinates. Apply equivalent screen fit to the QR-bill preview, preserve vertical scrolling, and keep print-only markup/styles unscaled.

Move the existing issue action into a bottom action bar contained by the editor. Display the current draft invoice number and `calculateInvoiceTotal` result formatted with the existing money helper. Preserve the existing confirmation, `issuing` state, issue validation, messages, and callbacks. Use sticky positioning only when the editor has enough usable viewport height; switch to normal flow when the app viewport or editor pane is too short for the bar and focused content to remain visible.

## Feature Metadata

**Feature Type**: Enhancement / UX improvement  
**Estimated Complexity**: Medium  
**Primary Systems Affected**: Invoice preview sizing, renderer layout and styles, invoice issue-action presentation  
**Dependencies**: Existing React, CSS, `ResizeObserver`, Vitest; no new runtime dependency expected

---

## CONTEXT REFERENCES

### Relevant Codebase Files — Read Before Implementing

- `src/renderer/components/InvoiceWorkspace.tsx:64-65` — Existing preview root and measured pagination refs.
- `src/renderer/components/InvoiceWorkspace.tsx:150-238` — Preview content key, page/row measurement, `ResizeObserver`, font/image remeasurement, and page assignment. Keep these measurements independent of screen scale.
- `src/renderer/components/InvoiceWorkspace.tsx:239-310` — Editor section and current Issue invoice action. Relocate the action after the editor controls while retaining its confirmation and validation behavior.
- `src/renderer/components/InvoiceWorkspace.tsx:608-633` — Preview root and invoice page stack. Add a screen-only viewport/stage boundary that can size pages without changing their data or page order.
- `src/renderer/components/InvoiceWorkspace.tsx:828-859` — Invoice total presentation and QR-bill preview placement; ensure the final QR-bill page follows the same screen-fit rule.
- `src/renderer/styles/global.css:380-415` — Two-column workspace and current responsive page width/aspect ratio.
- `src/renderer/styles/global.css:505-515` — `.invoice-pages` stack spacing and alignment.
- `src/renderer/styles/global.css:658-703` — Print rules establishing unscaled A4 dimensions; keep print layout independent from interactive scaling and sticky controls.
- `src/renderer/styles/global.css:704-752` — Existing width breakpoints that collapse the editor/preview columns; avoid regressions at mobile widths.
- `src/renderer/App.tsx:196-228` — Existing issue orchestration, loading/result messaging, confirmation follow-up, and draft rotation. Phase 3 must keep this flow intact.
- `src/shared/invoice/money.ts` — `calculateInvoiceTotal` and `formatCurrency` used for action-bar context; do not duplicate arithmetic or format display strings into model values.
- `src/renderer/invoice/assignMeasuredPages.ts` — Page-assignment algorithm. It expects page-space row heights/capacities, not screen-scaled geometry.
- `.agents/plans/invoice-editor-ux-prd.md:92-100` — Required patterns, especially intrinsic page geometry, issue-bar behavior, and the shared draft source of truth.
- `.agents/plans/invoice-editor-ux-prd.md:114-128` — Exact responsive-preview and persistent-action requirements.
- `.agents/plans/invoice-editor-ux-prd.md:188-210` — Functional success criteria and quality indicators.
- `.agents/reference/components.md` — Renderer, focus, and accessibility conventions.
- `.agents/reference/pdf-preview.md` — Preview and PDF parity constraints.
- `.agents/AGENTS.md` — Security boundaries, style, project commands, and validation guidance.

### New Files to Create

- None expected. If a pure preview-fit calculation is extracted for deterministic testing, keep it under `src/renderer` and add a focused unit test under `tests/unit`.

### Relevant Documentation

- [MDN: ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) — Observe the preview element itself so changes in the editor/preview split or zoom are detected even when the outer window size is unchanged.
- [MDN: CSS transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/transform) — A transform changes visual coordinates without changing normal document flow; a wrapper must reserve the scaled page dimensions to avoid overlap or misleading gaps.
- [Electron: webContents zoom APIs](https://www.electronjs.org/docs/latest/api/web-contents#contentssetzoomfactorfactor) — Electron/Chromium zoom changes the available CSS viewport; verify the responsive behavior at increased zoom without adding a new zoom control.
- No external library or IPC documentation is needed. The feature uses existing renderer APIs and adds no process-boundary behavior.

### Patterns to Follow

**Renderer state:** Use local React state/ref for measured preview scale. Observe the preview pane element with a `ResizeObserver`, clean up the observer, and avoid setting state when the derived scale has not changed. Do not read layout in a repeated synchronous render loop.

**Pagination:** `InvoiceWorkspace` currently measures invoice page inner height, fixed blocks, table headings, footer, closing blocks, and rows before calling `assignMeasuredPages`. Preserve the same page-space inputs regardless of the interactive screen scale. If a measured DOM rectangle is affected by scaling, convert it back to unscaled page coordinates or measure the unscaled page layer.

**Money:** Derive action-bar total from `calculateInvoiceTotal(draft.lines)` and display it using `formatCurrency` with `draft.currency`. Never calculate from a formatted preview string.

**Issue action:** Keep the current `window.confirm`, `setAttemptedDraftId`, empty-row recovery, `validateIssueDraft`, `onIssue`, and `issuing` behavior. Move or share the existing button markup rather than implementing another issue path. The bar shows the same `draft.suggestedNumber` that the preview and issue request use.

**Print:** The production PDF path uses `InvoiceWorkspace` in `printOnly` mode and Chromium's A4 `printToPDF` options. Screen scale variables, stage dimensions, sticky positioning, and editor controls must not affect print-only rendering.

**Avoid:** Width changes that reflow the intrinsic invoice page; measuring scaled rows as if they had unscaled heights; width-only media queries as the only zoom solution; `position: fixed` spanning the preview; duplicated issue buttons/actions; obscuring the tab focus ring; new zoom controls; or changes to invoice data, IPC, and issuance transactions.

---

## IMPLEMENTATION PLAN

### Phase 1: Establish independent preview sizing

- Add a measurable interactive preview viewport and derive an A4 fit scale from its content width, with an upper bound of `1`.
- Keep invoice and QR-bill page proportions and their intrinsic content layout stable; reserve scaled width, height, and inter-page spacing in normal flow.
- Recompute from pane resize and zoom/layout changes. Keep the page stack vertically scrollable and prevent horizontal overflow at supported layouts.
- Keep print-only rendering at exact A4 dimensions with no interactive scaling.

### Phase 2: Preserve pagination and preview interactions

- Ensure the page-capacity and row-height measurements passed to `assignMeasuredPages` remain in intrinsic page coordinates.
- Preserve preview-to-editor clicks, row identifiers, and order after scale changes and page reassignment.
- Verify footer/oversized-row warnings and long invoices still use the existing pagination behavior.

### Phase 3: Add the editor-aligned persistent issue bar

- Relocate the current issue action into one bottom bar within the editor pane.
- Show the current invoice number and exact calculated total/currency.
- Keep issuing, disabled/loading, validation, confirmation, success, and failure behavior unchanged.
- Keep the bar sticky during ordinary editor scrolling, and return it to normal flow when available height is too short for safe sticky behavior.
- Ensure focus visibility and final editor fields are never obscured; do not overlay the preview.

### Phase 4: Validate behavior and update documentation status

- Exercise pane sizes, window sizes, zoom, keyboard traversal, print output, and issue workflow.
- Run the repository checks required by project guidance.
- Update Phase 3 status/checklists in `invoice-editor-ux-prd.md` only after the acceptance criteria are actually met. Do not use the stale Phase 2 label as evidence that this implementation is complete; current code already includes attempt-gated feedback and zero-row recovery, but the Phase 2 status needs separate reconciliation.

---

## STEP-BY-STEP TASKS

### Task 1: UPDATE `src/renderer/components/InvoiceWorkspace.tsx`

- **IMPLEMENT**: Add a screen-only ref/state boundary for the available preview width. Measure the preview container (not only `window.innerWidth`) and calculate `min(1, availableWidth / A4Width)` using a documented CSS-pixel/mm conversion or an intrinsic page measurement.
- **IMPLEMENT**: Render page wrappers that reserve the scaled page box plus scaled page gaps. Apply scale consistently to every invoice page and the QR-bill preview, with top-centered transform origin and no horizontal scrolling.
- **IMPLEMENT**: Limit the screen fit to interactive mode. A `printOnly` workspace must not set screen scale state/styles that change A4 output.
- **PATTERN**: Existing `previewRef`, `useLayoutEffect`, and `ResizeObserver` in lines 64 and 162-238; existing `.invoice-pages` stack and `QrBillPreview`.
- **IMPORTS**: No new package. Reuse existing React hooks; add `useCallback` only if stable observer callbacks are useful.
- **GOTCHA**: The current pagination effect uses `getBoundingClientRect()` for page capacities and row heights. Transforms affect those returned rectangles. Keep values in unscaled coordinates and avoid observing a wrapper whose size is itself set from its scale, which can create a `ResizeObserver` feedback loop.
- **VALIDATE**: `npm run typecheck`

### Task 2: UPDATE `src/renderer/styles/global.css`

- **IMPLEMENT**: Define interactive page-stage/wrapper styles that maintain the A4 aspect ratio and reserve the scaled height in normal flow. Add no app-theme styling to invoice paper.
- **IMPLEMENT**: Make `.invoice-pages` fit the preview column and retain vertical page spacing. Remove or revise rules that introduce horizontal overflow or make page content reflow as a substitute for scaling.
- **IMPLEMENT**: Keep the print rules explicit: A4 `210mm × 297mm`, scale `1`, no wrappers adding page breaks or gaps, no sticky issue bar, and no print-layout changes.
- **PATTERN**: Existing page rules around lines 380-415, `.invoice-pages` around 511, print rules at 658-703, and responsive breakpoints at 704-752.
- **GOTCHA**: CSS transforms do not reserve layout space. The wrapper must account for scaled page dimensions and gaps so multiple pages cannot overlap or leave large false gaps.
- **VALIDATE**: `npm run format:check` and inspect the print rules after formatting.

### Task 3: UPDATE `src/renderer/components/InvoiceWorkspace.tsx` issue action

- **IMPLEMENT**: Move the one existing Issue invoice action to the bottom of `.invoice-editor` in a persistent editor-aligned bar. Include `draft.suggestedNumber` and `formatCurrency(calculateInvoiceTotal(draft.lines).amount, draft.currency)` or the existing exact helper signature; show an appropriate placeholder/context while no valid total exists.
- **IMPLEMENT**: Keep `issuing` disabled/loading state, accessible button label, permanent-issue confirmation, attempt-gated validation, blank-row recovery, and valid `onIssue` path exactly once.
- **IMPLEMENT**: Keep server feedback visible and associated with the editor. The bar must not trap or steal focus.
- **PATTERN**: Existing issue controls at lines 285-310; `total` at line 63; issue orchestration in `src/renderer/App.tsx:196-228`; money functions in `src/shared/invoice/money.ts`.
- **GOTCHA**: Do not create a second issue action in a sticky overlay, do not trigger `onIssue` on invalid or zero-row drafts, and do not use a stale number or rounded display value as an input to the issue flow.
- **VALIDATE**: `npm run typecheck`

### Task 4: UPDATE `src/renderer/styles/global.css` for persistent and compact layouts

- **IMPLEMENT**: Align the action bar to the editor pane and keep it visible during ordinary document/editor scrolling without covering fields or the preview. Reserve sufficient bottom clearance if needed.
- **IMPLEMENT**: At short viewport height/high zoom, switch the bar to normal document flow based on available viewport/editor height. Prefer a robust CSS breakpoint/container strategy over a fixed pixel assumption if the editor can expose its available block size.
- **IMPLEMENT**: Preserve readable number/total context and visible keyboard focus in both light and dark application appearances.
- **PATTERN**: Shared app tokens in `src/renderer/styles/tokens.css`; editor/workspace and breakpoints in `global.css:380-415` and `704-752`.
- **GOTCHA**: Sticky descendants can fail when ancestors create scrolling/overflow contexts. Test Tab and Shift+Tab when focus moves above and below the bar. The bar may not cover the preview or a focused form control.
- **VALIDATE**: `npm run lint && npm run format:check`

### Task 5: ADD focused preview-fit tests if a pure helper is introduced

- **IMPLEMENT**: If fit-scale calculation is extracted, cover zero/unmeasured width, narrow panes, exact A4 fit, wider-than-A4 panes (scale remains 1), and small floating-point changes. Do not add a DOM testing framework solely for this feature.
- **PATTERN**: Vitest unit-test style in `tests/unit/invoicePageLayout.test.ts` and `tests/unit/issueValidation.test.ts`.
- **GOTCHA**: Avoid tests that encode browser layout behavior in Node. Validate `ResizeObserver`, transformed layout, focus, and print behavior in the Electron workflow.
- **VALIDATE**: `npm test -- tests/unit/invoicePageLayout.test.ts`

### Task 6: VERIFY responsive and issue workflows; reconcile the UX brief

- **IMPLEMENT**: No additional product change unless an acceptance discrepancy is found. Update the Phase 3 checkboxes/status in `.agents/plans/invoice-editor-ux-prd.md` after verification; separately reconcile its Phase 2 status if the project owner intends the status to reflect existing code.
- **VALIDATE**: Run all repository checks and perform the manual scenarios listed below. Inspect both built-in templates and the generated A4 output.

---

## TESTING STRATEGY

### Unit Tests

- Only add focused tests if scale calculation is a pure extracted helper. Verify scale is positive, never exceeds `1`, fits widths below A4, remains `1` when the pane is wider, and handles an unmeasured/zero-width state safely.
- Existing `invoicePageLayout.test.ts` covers intrinsic page assignment; add a regression assertion only if implementation introduces a pure conversion that can be tested without browser layout.

### Integration and Renderer Validation

- No IPC or persisted-data changes are expected. Existing invoice issue and PDF paths must remain intact.
- This repository does not show an installed React DOM test harness. Validate ResizeObserver behavior, pane layout, sticky positioning, keyboard focus, and print output manually in Electron rather than adding a new test dependency for this phase.

### Edge Cases

- Preview pane width is initially zero or temporarily unavailable during mount/navigation.
- Pane width changes when the app switches between two-column and stacked layouts, or while the outer window stays the same size.
- High Chromium zoom and operating-system text scaling reduce the available CSS viewport.
- Multiple invoice pages and the QR-bill page fit without horizontal scrolling, overlap, or unscaled gaps.
- Resize changes visual scale but not pagination assignment, preview-to-editor focus mapping, or invoice content.
- Long service descriptions, logos, oversized rows, and footer warnings continue to behave as before.
- Print-only rendering remains A4 and does not include screen scale, wrapper spacing, sticky action UI, or editor context.
- The issue bar shows the current editable number and total for CHF and EUR, follows total edits, and is disabled while issuing.
- Empty-row and invalid issue attempts retain Phase 2 behavior; valid issue, backend rejection, success message, draft rotation, and confirmation still follow the existing path.
- Keyboard focus can move through editor controls and the action bar without being covered at normal and short viewport heights.

---

## VALIDATION COMMANDS

Run the repository's documented checks after implementation:

### Level 1: Types and Style

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

### Level 2: Automated Tests

- `npm test -- tests/unit/invoicePageLayout.test.ts` (and any new pure helper test)
- `npm test`

### Level 3: Build and Smoke

- `npm run build`
- `npm run smoke`

### Level 4: Manual Electron Validation

- Check preview fit in small, standard, and expanded windows in both two-column and stacked layouts.
- Resize the window and preview pane repeatedly; confirm the preview updates without horizontal scrolling, overlap, or misleading vertical gaps.
- Repeat at increased Chromium zoom and with operating-system text scaling.
- Confirm invoice pages and QR-bill retain their proportions and every preview target still focuses the matching editor field after resize.
- Scroll from the top to the bottom of the editor. Confirm the issue bar stays aligned with the editor, shows the live number and total, and does not cover the preview, final controls, or focused control.
- Repeat keyboard navigation with Tab and Shift+Tab through the whole editor at standard and short window heights; verify the focus ring remains visible.
- Attempt issuance with zero rows, an invalid draft, a valid draft, and a backend-only failure. Verify no duplicated action or issue request and preserve existing confirmation/loading/error/success behavior.
- Generate PDFs for both templates, including a multi-page invoice, and confirm A4 page dimensions, pagination, content, and QR-bill ordering are unchanged by screen fit.

---

## ACCEPTANCE CRITERIA

- [ ] Every interactive invoice and QR-bill preview page fits the available preview width, preserves its page proportions, and never scales above 100%.
- [ ] Preview fit recomputes when the preview pane or layout changes, including zoom/layout changes that do not depend solely on outer-window resize.
- [ ] Pages remain vertically scrollable with no horizontal access requirement, overlap, or misleading empty gaps.
- [ ] Screen scaling does not alter intrinsic pagination measurements, page assignment, or preview-to-editor targeting.
- [ ] Print-only output remains unscaled at A4 and retains existing pagination and PDF content.
- [ ] One persistent Issue invoice bar remains aligned with the editor during ordinary scrolling and shows the current draft number and calculated total/currency.
- [ ] The bar preserves existing confirmation, empty-row recovery, validation gate, loading/disabled state, errors, success, and backend issue flow.
- [ ] At short viewport heights or high zoom, the bar adapts to normal flow when sticky behavior could obscure content or focus.
- [ ] No invoice control, preview content, or keyboard focus indicator is hidden behind the bar.
- [ ] Typecheck, lint, formatting, tests, build, and smoke checks pass; manual responsive, keyboard, and print checks pass.

---

## COMPLETION CHECKLIST

- [ ] Interactive A4 fit and reserved scaled page layout implemented for invoice and QR-bill previews.
- [ ] Intrinsic pagination measurement and preview focus mapping preserved through resizing.
- [ ] Print-only layout verified unchanged at A4.
- [ ] Single editor-aligned issue bar shows live number and total and preserves existing issue flow.
- [ ] Short-height/high-zoom adaptation and keyboard visibility verified.
- [ ] Automated checks and manual Electron workflows pass.
- [ ] Phase 3 status in `invoice-editor-ux-prd.md` updated after acceptance criteria are met.

## NOTES

- This plan is limited to Phase 3. Phase 4 customer CSV control consolidation and Phase 5 service dates are out of scope.
- The source currently contains attempt-gated issue errors, zero-row recovery, and local preflight behavior in `InvoiceWorkspace`; this appears to satisfy the Phase 2 implementation dependencies even though the UX brief still labels Phase 2 “Not implemented.” Confirm and reconcile that status separately rather than duplicating or rewriting Phase 2 during this work.
- **Confidence Score**: 8/10. Product behavior and acceptance criteria are explicit. The primary implementation risk is keeping current DOM-based pagination measurements stable while introducing visual scaling, followed by sticky behavior across Electron zoom and short viewport heights.
