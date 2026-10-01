# Front-End Component Guidelines

Framework-neutral guidance for the invoicing app's TypeScript and HTML/CSS renderer. The UI framework is not selected yet; adapt these rules to it without changing the product behavior in the PRD.

## Component design

- Organize UI by user-visible responsibilities: invoice editor, line-item editor, customer selector, settings sections, theme selector, preview page, and reusable form controls.
- Keep presentation components focused. Put calculations, CSV operations, numbering, PDF generation, and persistence in domain modules or main-process services, not visual components.
- Treat the typed invoice model as the source of truth. Render editor and preview from it; never scrape values from rendered invoice DOM.
- Pass data and explicit callbacks across component boundaries. Avoid hidden global state and components that reach into Electron APIs.
- Give each line item a stable ID. Do not use its changing array index as identity for a row, preview target, or input ref.
- Use shared CSS tokens and control styles to keep the editor, settings, and customer screens consistent.

## Forms and invoice tables

- Prefer native HTML semantics: buttons for actions, labels associated with inputs, select controls for choices, and a semantic table for service rows.
- Give each input a visible, descriptive label. Associate validation messages with the input and explain how to correct the error. On failed Generate, focus the first invalid field.
- Use suitable native input types and constraints, but validate invoice and QR data again in the trusted application layer before issuing.
- Keep calculated line totals and invoice total read-only. Store numeric values in the domain model and format only for display.
- A semantic table with independent inputs is simpler than a custom spreadsheet grid. Use the WAI-ARIA grid pattern only if implementing its full keyboard model, including arrow navigation and transition into cell editing.

## Preview-to-editor navigation

- Map each editable preview field to a stable domain field ID and matching editor control. For line items, map both the stable row ID and field name.
- Make preview targets mouse and keyboard operable. Provide an accessible name such as “Edit service description, row 2”; Enter and Space should activate it.
- On activation, scroll the matching editor input into view, focus it, and show a visible focus indicator.
- Do not make calculated totals or the generated QR graphic appear editable. Pagination or row changes must not break preview-to-editor mapping.

## Appearance and accessibility

- Use shared design tokens for app chrome and support System, Light, and Dark appearance. Keep invoice-paper and print styles independent of the app theme.
- Preserve visible keyboard focus, clear labels, sensible heading order, and adequate contrast in both themes. Do not use color alone to communicate errors or state.
- Prefer native semantics over custom ARIA roles. Add ARIA when HTML alone does not express the behavior.
- Keep controls usable at supported window sizes and with operating-system text scaling.

## Validation

When UI testing tools exist, cover keyboard-only navigation, label/error associations, focus after preview activation, mapping after rows are inserted or removed, theme changes, long descriptions, window resizing, and text scaling.

