# Product Requirements Document: Local Invoicing App

**Status:** Draft for review  
**Product type:** Local desktop application  
**Platforms:** macOS and Windows  
**Primary reference:** [example_invoice.pdf](../example_invoice.pdf)

## 1. Executive Summary

The Local Invoicing App helps a sole proprietor or small service business create polished customer invoices without manually updating a spreadsheet or rebuilding a PDF. It opens to an editable invoice with company details prefilled, supports customer selection from a human-readable CSV, calculates line totals and invoice totals, and shows a live, multi-page preview.

The generated A4 PDF contains the invoice followed by a Swiss QR-bill payment page as its final page. Issued invoices are archived with their invoice data so later changes to a customer or company profile do not alter an already issued record. The app runs locally on macOS and Windows; it does not require a hosted account or send invoices for the user.

**MVP goal:** Let the user create, preview, generate, and archive a correct German-language invoice with a standards-compliant Swiss QR-bill, while keeping the customer list editable as a CSV.

## 2. Mission

Make routine invoicing quick, reliable, and understandable for a small business that wants local control of its customer data and invoice files.

Core principles:

1. **Correct totals:** Calculate line and invoice totals consistently and show them before issue.
2. **Human-readable data:** Keep the customer CSV usable outside the app.
3. **Stable issued records:** Preserve an issued invoice and its PDF; corrections create a replacement invoice.
4. **Preview matches output:** Use the same invoice layout rules for the live preview and exported PDF.
5. **Standards-based payment page:** Use the SwissQRBill library for QR-bill content and layout.

## 3. Target Users

### Primary user: Independent service provider

- Runs a small, likely one-person business in Switzerland.
- Creates recurring invoices for a list of customers.
- Uses a computer comfortably for ordinary documents and spreadsheets, but should not need to edit code or HTML.
- Wants a recognizable invoice design, reliable arithmetic, Swiss QR payment details, and local files that can be inspected or backed up.

### Secondary user: Occasional helper

- May enter customer or invoice details on behalf of the business owner.
- Needs clear validation and should not need access to developer tools or a server account.

Key pain points include copying customer and company details, manually calculating totals, maintaining a consistent invoice number, fitting content across pages, and creating a Swiss QR-bill separately.

## 4. MVP Scope

### Core functionality

- ✅ Open a new invoice with configured company information, today’s date, the next number suggestion, and one autosaved current draft.
- ✅ Select, add, edit, and remove customers backed by a user-selected CSV.
- ✅ Edit invoice rows with description, service date, hours (including fractional hours), hourly rate, and calculated row amount.
- ✅ Recalculate totals as rows and values change; support CHF or EUR, with an app default and per-invoice override.
- ✅ Use German invoice labels and configurable payment terms, with a calculated but editable due date.
- ✅ Preview all invoice pages and the Swiss QR-bill payment page while editing; keep the QR page last.
- ✅ Let the user click an editable invoice field in the preview to focus its corresponding control in the editor; edits are made in the editor and reflected in the preview.
- ✅ Generate an A4 PDF, assign the next invoice number on generation (with an override), and archive the PDF and invoice snapshot.
- ✅ Keep issued invoices unchanged; make corrections as replacement invoices with new numbers.
- ✅ Configure company identity and contact details, logo, IBAN/bank details, footer notes, currency, payment term, invoice numbering, and template.
- ✅ Follow the operating system’s light/dark appearance by default, with a user setting to override it to Light or Dark.
- ✅ Offer a close recreation of the supplied invoice and one simpler alternate template, with basic logo/color and section visibility controls.
- ✅ Reload changes made to the customer CSV outside the app and detect conflicts before writing.
- ✅ Support invoices without VAT calculations and show a configurable VAT note.

### Technical

- ✅ Package a local desktop application for macOS and Windows.
- ✅ Use Electron, TypeScript, HTML, and CSS for the application and invoice rendering.
- ✅ Generate the QR-bill with swissqrbill; combine it with the HTML-rendered invoice PDF.
- ✅ Store application settings, the active draft, and invoice archive metadata locally; let the user choose the PDF archive folder.

### Integration

- ✅ Read and write the customer CSV directly; support human-readable structured address fields.
- ✅ Embed invoice number as free-text payment message on the QR-bill; do not use a bank reference.
- ❌ Send invoices by email or integrate with a mail provider.
- ❌ Connect to accounting, banking, CRM, or cloud storage services.

### Deployment

- ✅ Operate without a cloud account or remote application server.
- ✅ Provide packaged builds for macOS and Windows.
- ❌ Provide hosted multi-user service, account management, or synchronization between computers.

## 5. User Stories

1. **As a business owner,** I want my company details and logo prefilled, **so that** I can start invoicing without re-entering sender information. For example, each new invoice shows my configured name, address, phone, email, IBAN, and logo.
2. **As a business owner,** I want to choose a customer from my list or add a new customer, **so that** I can address invoices accurately. For example, I can add a customer with a name, structured postal address, email, and phone.
3. **As a user preparing an invoice,** I want to edit service rows and see totals update immediately, **so that** I can check the amount before issue. For example, 1.5 hours at CHF 80/hour displays CHF 120.00 for that row.
4. **As a user preparing an invoice,** I want to see the full multi-page result including the QR-bill, **so that** I can review layout and payment information before generating the final PDF.
5. **As a business owner,** I want invoice numbers assigned when I generate an invoice, **so that** discarded drafts do not consume numbers. For example, the configured year/sequence advances only after the PDF is issued.
6. **As a business owner,** I want each issued PDF and its invoice data archived, **so that** the customer details and totals from that invoice remain available if records later change.
7. **As a user managing customers,** I want app edits and external CSV edits detected, **so that** I can keep using a spreadsheet or text editor without silently overwriting changes.
8. **As a business owner,** I want to customize the template, payment terms, currency, notes, and invoice sequence, **so that** the app fits my business without requiring HTML or code edits.
9. **As a user reviewing an invoice,** I want to click a field in the preview and jump to its editor control, **so that** I can quickly find and correct details without searching through the form. For example, clicking a service description in the preview focuses that row’s description control.
10. **As a user,** I want the app to follow my computer’s appearance by default while allowing a Light or Dark override, **so that** the interface stays comfortable in my environment.

## 6. Core Architecture & Patterns

### High-level architecture

Use Electron with a TypeScript application split between a privileged main process and a sandboxed renderer. The renderer provides the invoice editor, settings, customer management, and HTML/CSS preview. The main process owns filesystem access, CSV operations, local persistence, PDF generation, and archive writes. A narrow, validated IPC interface connects the two.

### Data flow

1. Load company settings and the single active draft from local application storage; read customers from the selected CSV.
2. Edit a structured invoice model in the renderer and calculate monetary totals using decimal-safe arithmetic.
3. Render the invoice model into HTML/CSS for the live page preview and Chromium PDF export.
4. Build the QR-bill page from the same invoice total, currency, company creditor details, customer debtor details, and invoice number message using swissqrbill/PDFKit.
5. Append the QR-bill PDF after the invoice PDF, then write the final PDF to the selected archive directory and save an immutable invoice snapshot and index metadata locally.

### Data entities

- **Company settings:** Company name; structured address; phone; email; website; logo path; IBAN and bank name; footer and VAT notes; selected template; default currency; default due-date term; invoice-number year/prefix/sequence; customer CSV path; PDF archive path; appearance preference (System, Light, or Dark).
- **Customer:** Name; street; building number; postal code; city; country; email; phone. CSV header mapping and delimiter handling must accommodate the existing file where possible; do not silently discard unknown columns.
- **Invoice draft/snapshot:** Invoice and due dates; invoice number; currency; selected customer data snapshot; sender data snapshot; line items; totals; template; generated-file path; issue timestamp.
- **Line item:** Description; service date; decimal hours; hourly rate; calculated line amount.

### Directory structure proposal

The current repository has no application source. The initial implementation may use a structure similar to:

    src/
      main/           # Electron main process, persistence, file and PDF services
      preload/        # Narrow IPC bridge
      renderer/       # Editor, settings, customer screens, preview
      shared/         # Typed invoice, settings, and customer models
      templates/      # Built-in invoice HTML/CSS templates
    tests/
      unit/           # Calculations, validation, numbering, CSV parsing
      integration/    # CSV and PDF generation flows

This is a starting proposal, not an existing repository convention.

### Patterns

- Keep invoice calculations and validation in shared, testable TypeScript modules; do not derive totals from display strings.
- Snapshot sender and customer fields into each issued invoice to preserve history.
- Write CSV and archive files safely; detect external CSV modifications before writing and retain a recoverable prior copy when updating it.
- Use the same HTML/CSS template for preview and print output. Apply A4 print rules and pagination behavior explicitly.
- Treat PDF generation as an issuance operation: validate required fields and QR data before consuming the next number or writing the final record.

## 7. Tools / Features

### Invoice workspace

- Show a new invoice when there is no unfinished draft; otherwise restore the autosaved current draft.
- Provide customer selection and a clear action to add a customer.
- Allow adding, editing, and removing line rows directly in the invoice table.
- Update line amount and grand total immediately when hours, rate, or row values change.
- Provide editable invoice date and due date. Default the invoice date to the current local date; calculate the due date from a configurable default term.
- Suggest the next invoice number using a configurable prefix/year/sequence. Assign it when generating, with an override before issue.
- Preserve line and customer edits when switching the selected customer unless the user explicitly chooses to replace the current invoice.
- Treat the editor as the source of truth for invoice data; the preview is not directly text-editable.

### Appearance and theme

- Default the application interface to System appearance and update it when the operating system’s light/dark setting changes.
- Provide explicit System, Light, and Dark choices in settings. Light and Dark are persistent overrides until the user selects System again.
- Apply the preference consistently to app navigation, forms, buttons, dialogs, and editor chrome, with accessible text and control contrast in both modes.
- Keep the invoice sheet preview and generated PDF styled by the selected invoice template and print rules, independent of the application interface theme.

### Preview and templates

- Display paginated A4 invoice pages plus the final QR-bill page.
- Keep the preview in sync with edits to customer, company settings, rows, dates, totals, currency, and template.
- Make editable invoice fields in the preview clickable. Clicking a field scrolls to and focuses the matching editor control; for line-item fields, focus the matching row and column. The user changes the value in that control, and the preview updates from the structured invoice model.
- Provide a visible focus/selection indication when navigating from preview to editor. Calculated totals and the generated QR graphic are display-only; QR data updates from its source fields.
- Include two built-in designs: a close recreation of the sample (green headings, logo, sender/recipient columns, service table, total, and closing/payment notes) and a simpler alternate.
- Support logo selection, basic color options, and visibility controls for optional sections. Freeform HTML/CSS editing is excluded from the MVP.
- Define print behavior for long descriptions, row breaks, totals, and page overflow. Keep the QR-bill as the final page regardless of invoice length.

### Customer management

- Let the user choose an existing customer CSV during setup or when changing the data source.
- Provide an in-app customer list and add/edit/remove flows.
- Preserve human readability, existing customer data, and unknown columns; handle quoted fields, delimiters, Unicode, and line endings robustly.
- Re-read the source when returning to the app and detect file changes while open. Before writing after an external modification, offer reload or resolve/retry rather than overwriting unseen edits.
- The customer address is stored in structured columns needed to populate QR-bill debtor data reliably.

### Company settings

- Configure company/legal name, structured address, phone, email, website, logo, IBAN, bank name, invoice-number sequence, default currency, due-date term, template, optional footer note, and VAT note.
- Preserve company profile settings in local application data, separate from the chosen customer CSV.
- Validate required creditor data before QR-bill generation and identify missing fields in the UI.

### PDF generation and archive

- Use Chromium print output for invoice pages and the SwissQRBill library to generate the payment page; combine into one PDF with the payment page last.
- Support CHF and EUR only so the invoice and Swiss QR-bill use a supported matching currency.
- Put the invoice number in the QR payment message as text. Do not generate a bank reference.
- Save the final PDF in the selected archive directory using a stable filename based on invoice number and customer name. Resolve filename collisions without replacing an issued PDF.
- Store the complete invoice snapshot and archive index locally. A correction creates a new invoice with a new number while the original record and PDF remain unchanged.
- Show a clear success state and open or reveal the generated PDF. Sending it to a customer is outside MVP scope.

## 8. Technology Stack

The repository currently contains the example invoice but no application code. Versions should be selected and pinned during implementation after compatibility checks; this PRD intentionally does not prescribe unverified version numbers.

| Area | Proposed technology | Rationale |
|---|---|---|
| Desktop shell | Electron | Runs on macOS and Windows and provides a bundled Chromium renderer suitable for HTML invoice preview and PDF printing. |
| Language | TypeScript | Matches the requested QR-bill ecosystem and supports shared types across UI and local services. |
| UI and invoice template | HTML and CSS, with the selected renderer UI framework determined at project setup | Supports live invoice preview and print-specific pagination without hand-drawing the invoice PDF. |
| App appearance | CSS theme tokens and operating-system color-scheme preference | Supports a System default and explicit Light/Dark overrides without changing invoice print styling. |
| Invoice PDF | Electron Chromium print-to-PDF | Renders the HTML/CSS invoice using the same layout as the preview. |
| Swiss QR-bill | swissqrbill with PDFKit | The library generates Swiss QR-bill PDFs and is designed for Node.js; use its PDF API for the standards-sensitive payment page. |
| PDF assembly | A maintained Node PDF merge library (candidate: pdf-lib) | Appends the generated QR-bill page after the invoice PDF. Confirm page preservation and licensing during dependency selection. |
| Customer data | User-selected CSV | Keeps the customer list human-readable and editable with common tools. |
| Settings and invoice index | Local JSON or another simple local format | Keeps settings and history metadata local without requiring a server database. |
| Packaging | Electron-compatible macOS and Windows packager | Produces desktop deliverables for the two required platforms. |

The SwissQRBill project describes a Node.js/browser library, PDF and SVG output, and an MIT license. The app should pin a verified release and review its package metadata and peer dependencies during implementation.

## 9. Security & Configuration

### Authentication and authorization

- No account or authentication is required for the local single-user MVP.
- Operating-system account access protects the application data and archive at rest; the app does not add encryption or user roles in v1.

### Electron security

- Enable context isolation and renderer sandboxing; disable Node integration in the renderer.
- Expose only required, schema-validated IPC methods through preload.
- Restrict file operations to user-selected CSV and archive paths, and use native file dialogs for path selection.
- Render customer and invoice content as text by default; do not interpret user-supplied content as executable HTML.
- Avoid remote scripts, remote content, analytics, or external services in the invoice workflow.

### Configuration and data storage

- Store company settings, current draft, and invoice archive metadata in the operating system’s app-data directory.
- Store customer data in the selected CSV and generated PDFs in the user-selected archive folder.
- Store file references as paths and handle missing/moved CSV or archive directories with a recoverable prompt.
- No environment variables or cloud secrets are required for ordinary use.
- Make local backup and restore expectations clear; automated cloud backup is out of scope.

### Deployment

- Package separately for macOS and Windows, including a bundled runtime and required dependencies.
- Document platform signing/notarization and installation prerequisites during release preparation.
- Do not claim automatic updates or signed distribution until those release mechanisms are selected.

## 10. API Specification

No public HTTP API is required because the MVP is a local desktop application without a hosted backend.

The renderer-to-main IPC contract should remain internal and narrowly scoped. Proposed operation groups:

| Operation | Purpose | Example input/output |
|---|---|---|
| settings:load / settings:save | Read and persist company and app settings | Settings object with selected CSV/archive paths and profile fields |
| customers:read / customers:write | Read, validate, and update the selected CSV | Customer records plus source revision metadata |
| draft:load / draft:save | Restore and autosave the current draft | Structured invoice draft |
| archive:list / archive:read | Browse issued invoice index and snapshots | Invoice number, customer, issue date, total, PDF path |
| invoice:generate | Validate, assign number, render and archive invoice | Draft plus optional number override; returns issued record and PDF path |
| dialog:choose-csv / dialog:choose-archive | Ask the OS for a file or folder | Selected path or cancellation result |

All IPC inputs must be validated in the main process. Do not expose arbitrary filesystem read/write operations to the renderer.

## 11. Success Criteria

### MVP success definition

A user can configure company details, select or create a customer CSV, prepare a multi-page invoice, review the complete preview, generate one combined PDF with a valid Swiss QR-bill as the final page, and find the immutable issued record in the archive.

### Functional requirements

- ✅ A new draft starts with the configured company data, current date, default currency, next number suggestion, and default due-date term.
- ✅ Customer selection updates the recipient shown in the preview and output.
- ✅ Clicking an editable preview field focuses the matching editor control, and changing that control updates the preview.
- ✅ The app follows OS light/dark changes in System mode; Light and Dark overrides remain selected until changed.
- ✅ Switching app appearance does not change invoice template colors or generated PDF appearance.
- ✅ Adding/removing rows and editing decimal hours or rate immediately updates row and invoice totals.
- ✅ CHF/EUR formatting and arithmetic are correct to the currency’s minor unit.
- ✅ The invoice can paginate across multiple A4 pages without clipping or overlap; the QR page is always last.
- ✅ QR data matches creditor, debtor, amount, currency, and invoice-number payment message in the invoice.
- ✅ Generating an invoice consumes one number; abandoning a draft does not consume one.
- ✅ Existing issued PDF and invoice snapshot do not change when source customer or company data changes.
- ✅ CSV changes made externally are detected before the app writes over them.
- ✅ macOS and Windows builds can open, edit, preview, and generate the same class of invoice.

### Quality indicators

- All calculations are covered for whole and fractional hours, CHF/EUR, blank/invalid values, and rounding boundaries.
- Generated PDFs are visually reviewed at one page and multiple pages for both templates.
- QR payloads are validated with an appropriate Swiss QR-bill validator and scanning test data.
- CSV tests cover UTF-8, quoting, commas/semicolons, existing columns, and concurrent modification detection.
- No serious security findings in renderer-to-main file access review.

### User experience goals

- A returning user can create a routine invoice without re-entering company or customer details.
- The current invoice amount and complete PDF layout are visible before issue.
- Errors identify the missing or invalid field and provide a direct way to fix it.

## 12. Implementation Phases

Indicative estimates assume one experienced full-stack developer and exclude external signing/account setup. These are planning ranges, not commitments.

### Phase 1: Foundation and settings (1–2 weeks)

**Goal:** Establish the cross-platform desktop shell and reliable local data model.

- ✅ Set up Electron, TypeScript, build scripts, and secure IPC boundaries.
- ✅ Define company, customer, invoice, and settings types.
- ✅ Implement settings persistence and CSV selection, parsing, validation, and conflict detection.
- ✅ Add customer list and CRUD operations.

**Validation:** Open the app on development targets; round-trip customer CSV records without data loss; detect an external edit before saving.

### Phase 2: Invoice editor and live preview (1–2 weeks)

**Goal:** Support the complete draft workflow and sample-based visual design.

- ✅ Implement invoice editor, customer selection, line items, calculations, dates, and number suggestion.
- ✅ Implement the two built-in templates, A4 multi-page live preview, and preview-to-editor field navigation.
- ✅ Add current-draft autosave and restore.
- ✅ Add System, Light, and Dark appearance modes for the application interface.

**Validation:** Exercise quantity/rate calculations, verify preview values and pagination for short and long invoices, and confirm clickable fields focus the correct editor control, including fields in line-item rows.

### Phase 3: QR-bill, PDF issue, and archive (1–2 weeks)

**Goal:** Generate and preserve the final issued invoice.

- ✅ Generate invoice PDF from HTML/CSS and Swiss QR-bill PDF from the selected invoice data.
- ✅ Combine pages with the QR-bill last; validate fields before assigning the invoice number.
- ✅ Write PDF, immutable snapshot, and archive index; implement correction-as-replacement flow.

**Validation:** Check page order and layout, validate the QR-bill payload, verify numbering behavior, and confirm issued records remain unchanged.

### Phase 4: Cross-platform hardening and release packaging (1–2 weeks)

**Goal:** Prepare repeatable macOS and Windows builds for user review.

- ✅ Run end-to-end workflows for CSV, editing, preview, generation, and archive.
- ✅ Package both platforms and test fresh installation and app-data behavior.
- ✅ Complete accessibility, failure-state, and recovery review.

**Validation:** A test user completes the sample workflow from setup through finding the archived PDF on each supported platform.

## 13. Future Considerations

- Cloud synchronization and multi-device or multi-user access.
- Sending invoices directly through an email provider.
- VAT calculations, multiple tax rates, and VAT reporting.
- Freeform visual template editor or user-authored HTML/CSS.
- Additional invoice languages and multilingual QR-bill pages.
- Multiple currencies beyond CHF and EUR, subject to payment-page support.
- Saved service catalog, recurring invoices, payment tracking, reminders, and credit notes.
- CSV import/export tools, migration assistance, and configurable backup/restore.
- More advanced sequence formats and yearly close workflow.

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| QR-bill data or page layout is invalid | Customers may be unable to pay or payment may be misdirected. | Use swissqrbill, validate required structured creditor/debtor data, test generated payloads with a QR-bill validator, and keep the QR page separate from custom HTML layout. |
| HTML preview differs from generated PDF | User may issue a document with unexpected pagination or styling. | Use the same Chromium rendering engine for preview and PDF output, define explicit A4 print styles, and visually validate both templates with long invoices. |
| External CSV edits conflict with app changes | Customer changes may be lost. | Track source revision/modified state, reload before writing, show a conflict resolution path, and retain a recoverable pre-write copy. |
| Currency arithmetic or rounding is inconsistent | Printed totals and QR payment amount may differ. | Use decimal-safe monetary calculations, define rounding rules once in a shared module, and test CHF/EUR boundary cases against the generated QR payload. |
| Platform packaging or filesystem permissions differ | App may fail to open, save a CSV, or write an archive on one OS. | Test macOS and Windows builds, use native file dialogs, handle path/permission errors explicitly, and document signing/notarization requirements. |

## 15. Appendix

### Related files

- [example_invoice.pdf](../example_invoice.pdf): one-page A4 reference invoice showing logo, company and customer blocks, invoice date/number, service rows, total, closing, and VAT/payment notes.
- [Create PRD skill](skills/create-prd/SKILL.md): source structure and authoring requirements for this document.

### Key technical references

- [SwissQRBill repository](https://github.com/schoero/swissqrbill): Node.js/browser Swiss QR-bill generation; project documents PDF generation via PDFKit.
- [SwissQRBill complete invoice guide](https://github.com/schoero/swissqrbill/blob/main/docs/how-to-create-a-complete-qr-bill.md): example of composing invoice content with a QR-bill in PDF.
- [SwissQRBill package metadata](https://github.com/schoero/swissqrbill/blob/main/package.json): verify the selected release, license, runtime support, and peer dependencies before pinning.
- [SIX Swiss QR-bill implementation guidelines](https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-en.pdf): authoritative QR-bill data and layout specification; verify the current version during implementation.

### Assumptions and open implementation choices

- The app is local and initially single-user; no cloud service, account system, or remote API is needed.
- The selected customer CSV remains the customer source of truth. App settings, current draft, and archive metadata are stored locally; final PDFs are written to the selected archive folder.
- CHF and EUR are the only supported invoice currencies in v1, ensuring the QR-bill currency matches the invoice.
- Invoice number is included as the QR payment message, not a formal bank reference.
- VAT is not calculated in v1; the user can configure the VAT statement shown on the invoice.
- Dependency versions, CSV header mapping behavior for an existing file, exact PDF merge library, installer/signing approach, and detailed number-prefix defaults must be confirmed during implementation without changing the product decisions above.
