---
name: application-qa
description: Test a complete application through realistic user workflows, reporting functional, visual, and cross-view data consistency defects.
metadata:
  short-description: Thoroughly test applications as a user
---

# Application QA

Use this skill when asked to thoroughly test an application from a user's perspective. Exercise the available application, verify what users see and what the application saves, and report defects with enough evidence to reproduce them. This is a testing and reporting workflow; do not change application code unless the user also asks for fixes.

## Prepare the test

1. Inspect project guidance and product requirements, then identify how to launch the app, its supported platforms, user-facing screens, main workflows, and the expected behavior of important controls.
2. Use the app's UI through the available browser or desktop interaction tools. If the app cannot be launched or reached, report that limitation plainly and test only what is accessible; do not present code inspection as completed UI testing.
3. Find a dedicated test environment or create clearly disposable test data. Avoid real customer data and production services. Use existing automated checks only as supporting evidence; they do not replace exercising the UI.
4. Build a coverage checklist from the actual interface. Include every screen and workflow, and inventory visible controls such as buttons, links, tabs, menus, toggles, form fields, dialogs, and keyboard actions. Adapt coverage to the product rather than assuming a particular web framework or database.

## Exercise workflows and controls

- Walk through realistic end-to-end journeys in the order a user would use the app. For every available, safe control, exercise its main action and verify the visible result. Re-snapshot or re-inspect after navigation and significant state changes so interactions use current controls.
- For forms, cover representative valid input, required values left blank, malformed values, boundary values, long text, and relevant character, date, number, and locale cases. Check validation messages, disabled/enabled states, repeated submission, cancellation, and recovery from errors where applicable.
- Check save, reload, revisit, and reopen behavior to confirm that intended changes persist and unsaved changes behave as indicated. Use read-only storage or service checks only when available and safe; compare them with what the UI displays.
- Test destructive actions only against disposable data. It is safe to inspect a confirmation dialog and cancel it. Do not delete real data or invoke actions that send, publish, issue, charge, or otherwise affect external parties unless the user has authorized that action and a suitable test environment is in use. Mark any such control as blocked or untested and explain why.

## Verify behavior across the application

Identify which values are the source of truth and which screens, summaries, previews, exports, or generated documents depend on them. Change representative values through the normal UI, then verify each dependent view updates at the expected time (immediately, after save, or after reopening, according to product behavior).

Check derived values using the product's documented rules and known test inputs. For example, when editing an invoice, verify that adding, editing, and removing a line updates the preview's description, quantity, price, and totals. Change relevant company settings and confirm the invoice preview reflects them. If export or print is a supported and safe test action, verify the generated output against the preview and entered data. Report mismatches between any of these views, including stale, missing, duplicated, or incorrectly calculated content.

Do not assume that a displayed value is correct merely because it looks plausible. Trace it back to the user input or documented rule, and state the expected value in the finding.

## Inspect visual quality and usability

Capture screenshots of each major screen and representative states, including validation, empty, confirmation, and success states where available. Review them for inconsistent spacing or alignment, clipped or overlapping content, awkward wrapping, unexpected scrollbars, missing controls, hierarchy changes, and stale or mismatched content.

Resize the app or use supported responsive viewports to check narrow, intermediate, and wide layouts. Check appearance themes and keyboard/focus behavior when the application supports them. Do not call a layout responsive if the product only supports a fixed desktop window; report the actual tested sizes and platform instead.

Inspect console errors, visible error states, and failed requests when the interaction tools expose them. Connect each reported symptom to a user action and preserve screenshots or logs as evidence when practical.

## Report findings

Report all distinct observed defects, including minor visual inconsistencies. Group repeated instances of the same underlying issue while listing the affected screens. Separate confirmed defects from usability concerns and test limitations. Do not silently fix issues during testing.

For each finding, include:

- A concise title and impact level: critical, high, medium, or low.
- Screen or workflow and exact reproduction steps, including the test values needed.
- Expected result and actual result.
- Evidence such as screenshot path, console message, or a safe data comparison.

Finish with a coverage summary: workflows and controls exercised, input and visual cases covered, environment and window sizes tested, blocked or untested actions with reasons, and total findings by impact. Clean up only test data and processes created for this run, and leave unrelated user data and services untouched.
