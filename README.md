# Local Invoicing App

This repository contains the product plan and implementation guidance for a local desktop invoicing app for a small Swiss service business.

The planned app will run on macOS and Windows. It will let users manage customers in a human-readable CSV file, prepare German-language invoices, preview multi-page output, and archive generated PDFs with a Swiss QR-bill as the final page.

## Current status

The project is in planning. No application source code, package configuration, build scripts, or automated tests have been created yet.

## Planned technology

- Electron and TypeScript for the desktop application
- HTML and CSS for the invoice preview and invoice PDF pages
- `swissqrbill` and PDFKit for Swiss QR-bill generation
- Local application storage for settings, the active draft, and issued-invoice metadata
- A user-selected CSV file as the customer source of truth

## Phase 1

Phase 1 establishes the desktop foundation and local data workflow:

- Secure Electron main, preload, and renderer boundaries
- Typed company, customer, invoice, and settings models
- Local settings persistence
- Customer CSV selection, parsing, validation, preservation of unknown columns, and external-edit conflict detection
- Customer list and create, edit, and delete workflows

Invoice editing, live preview, PDF generation, and QR-bills are planned for later phases.

## Documentation

- [Product requirements](.codex/PRD.md)
- [Repository guidance](.agents/AGENTS.md)
- [Customer CSV guidance](.agents/reference/csv-data.md)
- [Electron guidance](.agents/reference/electron.md)
- [Invoice domain guidance](.agents/reference/invoice-domain.md)
- [Preview and PDF guidance](.agents/reference/pdf-preview.md)
- [Renderer and accessibility guidance](.agents/reference/components.md)

## Development

Development commands will be added when the Electron application is scaffolded in Phase 1.
