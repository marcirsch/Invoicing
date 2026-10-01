# Customer CSV Data Guidelines

Use this guide when selecting, parsing, displaying, editing, saving, or migrating the customer CSV. The existing CSV is not in this repository, so inspect the actual file before making assumptions about its format.

## Preserve the user's file

- Treat the selected CSV as the customer source of truth and as a user-owned document.
- On first selection, inspect its header, delimiter, encoding/BOM, line endings, and row shape. If the format is ambiguous or malformed, ask the user or offer an explicit mapping/repair flow; do not silently rewrite it.
- Map existing columns to the app's customer fields without discarding unknown columns. Preserve column order and extra values through edits. New customer rows should leave unrelated columns empty.
- The target customer model requires name, email, phone, and structured street, building number, postal code, city, and country fields. If the existing file stores an address in one field, do not guess a split silently. Show the proposed mapping and require an explicit migration decision before changing the file.
- Keep phone numbers and postal codes as text. Preserve leading zeroes, plus signs, spaces, Unicode, and user-entered content.

## Parse and serialize as records, not lines

RFC 4180 is a useful baseline: quoted fields can contain commas, quotes, and line breaks; embedded quotes are doubled; records may end with CRLF; and the final record may omit its final newline. Real CSV dialects vary, so support the selected file's observed format rather than assuming one delimiter or line ending.

- Never parse CSV by splitting lines or commas. Use a maintained parser/serializer that supports quoted delimiters and quoted newlines, or implement and thoroughly validate a standards-aware parser.
- Treat all cells as text unless a field's domain explicitly requires validation. Do not automatically convert postal codes, phone numbers, IDs, or unknown columns to numbers/dates.
- Preserve spaces and empty cells. Do not trim, normalize Unicode, reorder headers, or change line endings without an explicit migration requirement.
- Support UTF-8 and a UTF-8 BOM. If the encoding cannot be decoded safely, report it and preserve the source; do not guess and save a replacement.
- If comma/semicolon/tab delimiter detection is ambiguous, ask the user to select it. Keep the detected/selected dialect for writing.

## External edits and safe writes

- Record the source file identity and a content fingerprint when loading it. Before each save, verify the file has not changed since load.
- If another program changed the file, pause the write and offer reload or a deliberate conflict-resolution action. Never silently overwrite an external edit.
- Before a structural migration or first write, make a recoverable backup. Explain the proposed header/address changes and let the user review them.
- Write a complete validated replacement using a safe platform-compatible replacement strategy. Preserve or restore the old file if serialization or replacement fails. Test this behavior on macOS and Windows.
- Do not treat a missing file, empty file, parse error, or permission failure as an empty customer list and then overwrite the source.
- Customer deletion affects the current CSV only; previously issued invoice snapshots retain their customer data.

## Spreadsheet formula risk

CSV quoting protects CSV syntax; it does not necessarily make a cell safe when opened by spreadsheet software. Treat cell content as data and never evaluate it. If a future export creates spreadsheet-oriented files, define and test a formula-injection mitigation. Do not silently alter source-of-truth customer names or notes to apply an export-only mitigation.

## CSV validation matrix

Test comma and semicolon delimiters; CRLF and LF endings; optional final newline; UTF-8 with and without BOM; accents and non-Latin text; quotes, commas, and embedded line breaks in cells; empty values; leading zeroes; unknown columns; malformed rows; external edits between load and save; read-only/locked files; interrupted writes; and macOS/Windows path behavior. Use a copy of the user's actual file when it becomes available.
