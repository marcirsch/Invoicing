# Invoice Preview and PDF Generation Guidelines

Use this guide for invoice HTML/CSS, live preview, Chromium printing, Swiss QR-bill generation, PDF assembly, or PDF validation.

## One invoice model and template

- Keep the structured invoice model as the source of truth for editor, preview, PDF, archive snapshot, and QR-bill input. Format values only at presentation boundaries.
- Use the same invoice template and data mapping for screen preview and Chromium PDF export. Screen-only canvas, shadows, zoom, and click-to-edit affordances must be hidden in print.
- Keep invoice-paper styling independent of app chrome. Dark app mode must not darken the invoice or payment page.
- Preserve preview-to-editor controls without changing printed layout. Map fields to stable invoice and line-item IDs.
- If simple screen pagination cannot match Chromium output, compare a paginated HTML view with rendering the current Chromium PDF into preview pages. Choose after checking parity and responsiveness; do not maintain a second hand-built invoice design.

## Pagination and print layout

- Define A4 page size and margins once; align CSS @page with Electron print settings. Use print styles to hide app controls and set paper colors.
- Use explicit page-break rules. Avoid breaks inside compact rows where practical; let long descriptions flow instead of clipping or forcing oversized content off-page.
- Keep table headings understandable across pages. Avoid separating totals from their context where practical.
- Check totals, closing text, and footers for clipping or stranded content. Append the QR-bill after all invoice pages.
- Wait for document fonts and local logo/image decoding before printing. Avoid remote assets so export works offline.
- The current app has no PDF export service. When `printToPDF` is added, use `pageSize: 'A4'`, zero-valued `margins` on all four sides, `printBackground: true`, and `preferCSSPageSize: true` to match the current `@page { size: A4; margin: 0 }` shell and its internal paper padding. Wait for `document.fonts.ready` and local image decoding before calling Electron.
- Check German characters, line wrapping, amount alignment, and logo scaling in both preview and output.

## Swiss QR-bill and assembly

- Generate the QR-bill page with the swissqrbill PDF API backed by PDFKit. Do not recreate QR geometry or payment/receipt areas in HTML.
- Isolate the library behind a service that accepts validated invoice data and returns PDF bytes. Keep its library-specific data structure out of renderer components.
- Render invoice pages with Electron Chromium and append the QR-bill page with a maintained PDF merge library. Verify runtime support, page-size preservation, and license before selecting and pinning it.
- Use the same calculated invoice total and CHF/EUR currency in QR data. Populate creditor/debtor from structured addresses and put the invoice number in the payment message; do not invent a bank reference.
- Verify the current SIX implementation guidelines and chosen swissqrbill release when implementing.

## Verification

Automate data-level checks and visually inspect rendered PDFs:

- Confirm page count is invoice page count plus one; the QR-bill must be last.
- Confirm intended A4 dimensions and no blank, clipped, overlapping, or unexpectedly scaled pages.
- Check extracted text for invoice number, customer, dates, line descriptions, totals, and currency. Compare QR amount/currency/message with the archived invoice snapshot.
- Validate QR-bill data with the validator linked from the library and perform a scan test.
- Exercise both templates with short and long invoices, many rows, long descriptions, fractional hours, CHF/EUR, and missing/large logos.
- Confirm preview clicks focus the correct editor field when rows flow across pages.

## References

- [Electron webContents API: printToPDF](https://www.electronjs.org/docs/latest/api/web-contents/)
- [CSS Paged Media](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media)
- [CSS Fragmentation and Page Breaks](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fragmentation)
- [SwissQRBill and PDFKit integration](https://github.com/schoero/swissqrbill)
- [SwissQRBill complete invoice guide](https://github.com/schoero/swissqrbill/blob/main/docs/how-to-create-a-complete-qr-bill.md)
- [SIX Swiss QR-bill implementation guidelines](https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-en.pdf)
