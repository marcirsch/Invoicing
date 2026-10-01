# Invoice Data and Calculation Guidelines

Use this guide when changing invoice/customer types, monetary calculations, date handling, numbering, issue/generation state, archived snapshots, or QR-bill data mapping.

## Canonical model

- Keep one typed invoice draft as the editable source of truth. Use that model to derive editor values, preview, PDF content, QR-bill input, and issued snapshot.
- Keep an issued snapshot separate from the active draft. Snapshot the sender, recipient, rows, dates, currency, number, totals, selected template/version, and issue timestamp so later profile or customer edits cannot alter the issued record.
- Use stable IDs for invoice rows and immutable invoice numbers after issue. A correction creates a new invoice as required by the PRD; never overwrite a generated PDF or issued snapshot.
- Keep presentation strings out of stored calculation fields. Preserve user-entered decimal text or a precise decimal representation and validate at boundaries.

## Money and quantities

JavaScript Number uses IEEE 754 binary floating point, so decimal inputs such as 0.1 are not represented exactly. Do not use ordinary floating-point operations as the authoritative money calculation. [MDN's Number guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_strings) explains this representation.

- Choose a single exact representation for currency inputs and calculations during implementation, such as decimal arithmetic or scaled integer units with a well-defined scale. Do not mix arithmetic strategies across the editor, archive, PDF, and QR payload.
- Hours are fractional quantities and may have a different precision from currency. Preserve their chosen precision; multiply exact quantity and rate values using the shared calculation module.
- Keep the rounding policy explicit and centralized. The product has not yet decided whether each row is rounded to cents before summing, or whether exact row values are summed and the invoice total is rounded once. It also has not chosen a tie-breaking rule. Confirm these policies before implementing the calculation module; do not infer them from display formatting.
- Keep invalid, blank, and partially typed input distinguishable from numeric zero in the editor. Reject non-finite values and values outside an intentionally chosen range before issuing.
- Use Intl.NumberFormat with the configured German locale and currency for display only. Formatting must never feed back into calculations.
- Convert the validated total to the representation expected by the pinned swissqrbill API only at the adapter boundary. Verify that serialization retains the intended cent amount.

## Currency and Swiss QR-bill

- An invoice has one currency, copied from the app default when a draft is created; the user may override it per invoice. Do not combine currencies inside one invoice.
- The initial scope supports CHF and EUR and does not calculate VAT. Keep the currency on the issued snapshot so later default changes do not affect it.
- Build the QR-bill payload from the same validated invoice total, currency, structured creditor/debtor address data, and payment message used by the issued invoice.
- The PRD calls for the invoice number as an unstructured payment message, not a bank reference. Do not reinterpret it as a QR reference.
- Check the current SIX QR-bill implementation guideline at implementation time. SIX lists version 2.4 as introduced on 13 November 2026, after version 2.3; the SIX overview states EUR QR-bills have specified permitted IBAN/reference or message combinations. Keep the selected library and payment-message combination compliant with the version in force when the app ships.
- Reject generation if the QR payload's amount/currency or required structured addresses do not agree with the invoice snapshot.

References: [SIX QR-bill standards page](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html), [SIX version 2.4 implementation guidelines](https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.4-en.pdf), [SwissQRBill API](https://github.com/schoero/swissqrbill).

## Dates

- Model invoice and due dates as date-only calendar values, not timestamps. Avoid timezone conversion that can move a displayed date to the prior or following day.
- Calculate the initial due date from the configured payment term, then preserve the user's explicit date override.
- The PRD does not define whether the payment term counts calendar or business days. Confirm this before implementing due-date arithmetic.
- Render dates consistently in the German invoice locale and keep the canonical stored date unambiguous.

## Numbering and issue transaction

- Generate a suggested year/prefix/sequence value for drafts. Assign and commit it only when Generate succeeds; opening or abandoning a draft must not consume a number.
- Allow the planned override, then validate uniqueness against issued records before committing.
- Treat final PDF creation, archive snapshot/index update, and counter advancement as one recoverable issuance flow. A failure must not silently create a duplicate issue or overwrite an existing record. Make retry behavior idempotent and preserve diagnostic details for recovery.
- Never renumber an already-issued invoice when settings or the calendar year changes.

## Calculation validation

Cover decimal rates and hours, half-cent boundaries, large permitted values, blank inputs, negative/invalid inputs, CHF/EUR, display formatting, and consistency between line amounts, grand total, snapshot, PDF text, and QR payload. Keep examples and expected outcomes tied to the explicitly approved rounding rule.

## References

- [SIX QR-bill overview and current standards](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html)
- [SIX Swiss QR-bill implementation guidelines, v2.4](https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.4-en.pdf)
