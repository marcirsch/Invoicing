# AGENTS.md

Repository guidance for Codex and other coding agents working on the invoicing app.

## Project Overview

This repository is planning a local desktop invoicing app for a small Swiss service business. The app will edit invoices, manage customers through a human-readable CSV, preview multi-page output, and generate an archived PDF with a Swiss QR-bill as its last page.

**Current state:** Phase 1 foundation is implemented. Invoice editing, PDF output, and QR-bill generation remain future phases.

The product requirements and decisions are documented in [.codex/PRD.md](../.codex/PRD.md). The sample layout is [example_invoice.pdf](../example_invoice.pdf).

## Planned Tech Stack

| Technology | Planned purpose |
|---|---|
| Electron | Local macOS and Windows desktop shell |
| TypeScript | UI, invoice model, and local services |
| HTML/CSS with Chromium | Invoice preview and invoice PDF rendering |
| swissqrbill with PDFKit | Swiss QR-bill payment page |
| Node PDF merge library | Append the QR-bill page after invoice pages |
| User-selected CSV | Customer source of truth |
| Local application data | Company settings, current draft, and invoice archive metadata |

Select and pin compatible dependency versions when implementing the app; no versions are established by the current repository.

## Commands

Use `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build` for development and validation.

## Planned Structure

The application source has not been created. The PRD proposes src/main, src/preload, src/renderer, src/shared, src/templates, and tests/ for the Electron processes, UI, shared models, templates, and tests. Follow the structure chosen during implementation and update this section if it changes.

## Architecture and Product Rules

- Keep the customer CSV as the source of truth. Preserve existing and unknown columns, detect external edits before writing, and avoid silent data loss.
- Store company settings, the single active draft, and invoice archive metadata locally. Save final PDFs to the user-selected archive folder.
- Treat the structured invoice model as the source of truth. Use decimal-safe calculations; never calculate totals from formatted display strings.
- Keep the editor as the place where values change. Clicking an editable preview field should focus its corresponding editor control; calculated totals and the generated QR graphic are display-only.
- Keep the invoice preview sheet and exported PDF styled by the selected invoice template, independent of the app's System/Light/Dark appearance.
- Assign an invoice number only when generating an invoice. Preserve issued snapshots and PDFs; corrections use a replacement invoice with a new number.
- Validate required invoice and QR-bill data before consuming a number or writing an issued record.
- Support German invoices and CHF/EUR in the initial scope. Do not add VAT calculations unless the product requirements are updated.
- Generate the QR-bill with swissqrbill and keep it as the final PDF page; do not recreate its standards-sensitive layout in HTML.

## Code Patterns

Apply these conventions to all new TypeScript. They adapt the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) to this Electron application; enforce formatting with the selected formatter and lint rules once the project is scaffolded.

### Naming and modules

- Use `lowerCamelCase` for variables, functions, parameters, and object properties. Use `UpperCamelCase` for classes, interfaces, types, and enums. Name values for what they represent; do not encode their type in the name or prefix interfaces with `I`.
- Use plural names for collections and clear boolean prefixes such as `is`, `has`, `can`, or `should`.
- Use UTF-8 source files, ES modules, named imports/exports, and `import type` / `export type` for type-only references. Do not use TypeScript namespaces, `require`, `eval`, dynamic `Function`, or modifications to built-in prototypes and global objects.
- Keep modules small and cohesive. Give each feature a clear public entry point and keep Electron process boundaries visible in its directory structure; never import main-process code into renderer code.

### Types and state

- Enable strict TypeScript. Prefer inferred types when an initializer makes the type obvious; add annotations at public boundaries, for complex expressions, and for structured values where they make the contract clear.
- Define object contracts with interfaces or explicit object types. Prefer the simplest type that expresses the model; avoid deeply nested conditional or mapped types when an explicit type is clearer.
- Do not use `any`, `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck` in production code. Treat data from CSV files, persisted settings, IPC, and third-party libraries as `unknown` until runtime validation converts it into a domain type.
- Model money in a decimal-safe domain representation and retain invoice state as immutable values. Derive totals, formatted strings, previews, PDF data, and QR payloads from the structured invoice model; never mutate a snapshot or calculate from rendered text.

### Functions, components, and errors

- Keep functions focused and make side effects explicit. Put filesystem, PDF, QR generation, and IPC effects behind narrow services; keep calculation and validation functions deterministic and easy to test.
- Renderer components receive typed data and callbacks. Keep editable state in the editor model, pass only display-ready values to the preview, and use a documented focus-mapping event for preview clicks.
- Validate inputs at their boundary and return actionable, user-safe failures. Preserve the original error as diagnostic context in the main process, but never expose raw filesystem paths, stack traces, or arbitrary exceptions to the renderer.
- Use JSDoc for exported APIs and non-obvious business or standards constraints. Use ordinary `//` comments to explain implementation decisions; do not comment code that is already clear from names and types.

### Data and UI safety

- Use parameterized APIs and escaped DOM rendering. Do not interpolate untrusted CSV or user-entered strings into HTML with `innerHTML` or into shell commands.
- Keep IPC request and response schemas explicit, serializable, and validated in the main process. Expose the least authority necessary through preload.
- Make templates and visual tokens theme-aware in the application UI, while invoice-template styles remain fixed by the selected invoice template and are shared by preview and PDF output.

## Electron Security

When implementing Electron, keep filesystem access in the main process, enable context isolation and renderer sandboxing, disable renderer Node integration, and expose only narrow, validated IPC operations through preload. Use native file dialogs for user-selected CSV and archive paths. Do not add remote content or arbitrary filesystem access to the renderer.

## Testing and Validation

There is no test suite yet. As implementation is added, cover invoice arithmetic and rounding, CSV preservation and conflict handling, numbering and immutable archives, preview-to-editor focus mapping, theme behavior, multi-page PDF layout, and QR-bill payload/page order. Verify both macOS and Windows packaging before release. Add the concrete test/build commands after selecting the project tooling.

## Key Files

| File | Purpose |
|---|---|
| [.codex/PRD.md](../.codex/PRD.md) | Product requirements, scope, architecture proposal, and acceptance criteria |
| [example_invoice.pdf](../example_invoice.pdf) | Visual reference for the current invoice |
| [.codex/AGENTS-template.md](../.codex/AGENTS-template.md) | Template used to create this guidance |

## On-Demand Reference Guides

- Read [reference/components.md](reference/components.md) when building renderer components, invoice editor controls, accessible forms, themes, or preview-to-editor interactions.
- Read [reference/electron.md](reference/electron.md) when working on Electron processes, preload/IPC, filesystem access, OS integration, appearance, or macOS/Windows packaging.
- Read [reference/pdf-preview.md](reference/pdf-preview.md) when changing invoice HTML/CSS, live preview, pagination, PDF export/assembly, Swiss QR-bill generation, or PDF verification.
- Read [reference/invoice-domain.md](reference/invoice-domain.md) when changing invoice/customer types, currency math or rounding, dates, numbering, issuance, snapshots, or QR payload mapping.
- Read [reference/csv-data.md](reference/csv-data.md) when reading, mapping, editing, migrating, or writing the customer CSV or handling external file conflicts.
