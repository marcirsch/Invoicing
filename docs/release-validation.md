# Release validation record

This document tracks review-build evidence for Phase 4. A blank or `Not run` entry is outstanding; it does not indicate a pass. Keep the evidence from disposable data and record any limitation beside the result.

## Build identity and limits

- Product name: `Local Invoicing`
- Bundle identifier: `ch.localinvoicing.app`
- Application version: `0.1.0` (from `package.json`)
- Build toolchain: Electron `44.9.3`; Electron Forge CLI and makers `8.0.1`
- Targets: native host architecture on macOS and Windows
- macOS artifacts: DMG and ZIP
- Windows artifacts: Squirrel Setup executable and ZIP
- Forge output directory: `release/make/` (`out/` remains owned by Electron Vite)
- Distribution signing: not configured. The packaged macOS binary is ad hoc signed without a Developer ID identity; the Windows installer has no signing credentials. No notarization credentials, publishing target, or update service is configured. macOS Gatekeeper and Windows SmartScreen may warn; these artifacts are for local review only.
- Icon: `resources/icons/local-invoicing.png` is provisional project artwork with derived ICNS/ICO files. It has not received brand/design approval; replace or approve it before public distribution.
- Build/review scope: installers and binaries are not published by these commands. Forge makes artifacts on the native host. The package identity and product name are initial project defaults and should be revisited before a public release.

## Commands

Run from the repository root after installing dependencies:

```sh
npm run make:mac
npm run smoke:packaged
```

```powershell
npm run make:win
npm run smoke:packaged
```

The first command is for macOS and creates a DMG and ZIP; the second pair is for Windows and creates a Squirrel Setup executable and ZIP. Forge's artifact names and subdirectories encode the product version, platform, and architecture where the maker supports it. Squirrel also emits `RELEASES` and a versioned NuGet package; keep those files together with the installer. Each platform build must run on its native operating system and architecture.

`npm run package` creates the host package without makers. `npm run make` creates the host distributables. Both commands first run the existing Electron Vite production build. Forge packages the three Electron Vite entry folders from `out/` and writes its own output to `release/`. `npm run smoke:packaged` launches the actual Forge package for the current host, points the app at a newly created temporary user-data directory, and checks the renderer/preload handshake. It removes only that temporary directory after the process exits. Run `npm run smoke` separately for the existing repository-output smoke check.

## Automated evidence

| Check                                                             | Result   | Notes                                                                                                                    |
| ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                                               | Passed   | 2026-10-23                                                                                                               |
| `npm run lint`                                                    | Passed   | 2026-10-23                                                                                                               |
| `npm run format:check`                                            | Passed   | 2026-10-23                                                                                                               |
| `npx vitest run tests/integration/invoiceArchiveStore.test.ts`    | Passed   | 10 tests; recovery states, legacy journal recovery, and digest conflicts covered.                                        |
| `npx vitest run tests/integration/invoiceIssuanceService.test.ts` | Passed   | 2 tests; retry and draft retention covered.                                                                              |
| `npm test`                                                        | Passed   | 17 files, 81 tests.                                                                                                      |
| `npm audit --omit=dev`                                            | Passed   | 0 vulnerabilities in the production dependency tree.                                                                     |
| `npm audit`                                                       | Findings | 4 high findings from the unfixed `image-size` ICNS parser advisory in the DMG maker chain.                               |
| `npm run build`                                                   | Passed   | Electron Vite production build.                                                                                          |
| `npm run smoke`                                                   | Passed   | Renderer and preload initialized from repository production output.                                                      |
| macOS native make and packaged smoke                              | Passed   | macOS 27.0.1, arm64, app 0.1.0; DMG/ZIP made and packaged smoke passed 2026-10-23, including after the print-layout fix. |
| Windows native make and packaged smoke                            | Not run  | Record exact artifact name, host Windows version/architecture, smoke result, and SHA-256.                                |

### macOS review artifacts

Build date: 2026-10-23. Host: macOS 27.0.1, arm64. Packaged launch smoke passed using a temporary user-data directory. This confirms startup and the preload API handshake; it does not verify a Finder installation or the end-to-end invoice workflow.

| Artifact                                                               | SHA-256                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `release/make/Local Invoicing-0.1.0-arm64.dmg`                         | `015534ab1cce8124f1b11f9b94c0b03d198b7edac8c4ad7c3b1aaa49622fd0cc` |
| `release/make/zip/darwin/arm64/Local Invoicing-darwin-arm64-0.1.0.zip` | `e95a8de3c9e931e3016055ad1443122d5495ab7a2f1b877c9e7416f37147a3c6` |

Recalculate the hashes after rebuilding or replacing either artifact.

## Platform release checklist

Complete this section independently on each clean macOS and Windows test environment. Use a disposable CSV and archive folder with Unicode and spaces in their paths. Record OS build, machine architecture, app version, artifact names, SHA-256 checksums, date, and evidence locations.

| Scenario                                                                               | macOS   | Windows | Evidence / issue                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh install, first launch, quit, relaunch                                            | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| App data and expected user-data location persist across restart                        | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| Choose CSV; create/select empty CSV; cancellation and missing/read-only path           | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| Unicode/spaced paths and external CSV edit conflict                                    | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| Add/edit customer and invoice; preview; issue; open/reveal archived PDF                | Partial | Not run | Packaged UI, isolated temporary profile and archive; created customer and issued RE-2026-001 for CHF 300. Archive record and PDF were present. Initial PDF review found horizontal clipping; a print CSS fix was rebuilt and smoke-tested, but its PDF has not been re-rendered. |
| Cancel native dialogs; archive unavailable/permission failure; draft remains retryable | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| Restart and verify draft, settings, issue record, and PDF preservation                 | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| System/Light/Dark appearance; invoice paper unaffected                                 | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| Keyboard-only operation, focus visibility/order, labels and error associations         | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| VoiceOver/Narrator spot check and 200% text-size review                                | Not run | Not run |                                                                                                                                                                                                                                                                                  |
| Contrast measurements in each appearance mode                                          | Not run | Not run |                                                                                                                                                                                                                                                                                  |

Do not use the live customer CSV or invoice archive for these checks.

## PDF and QR-bill review

As of 2026-10-23, SIX Implementation Guidelines QR-bill v2.3 are in force. Version 2.4 is scheduled to take effect on 2026-11-14; validate against the version effective on the actual test date and repeat after a guideline transition. In v2.4, SIX specifies only IBAN/SCOR reference or IBAN/unstructured message for EUR QR-bills. See the [SIX QR-bill standards page](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html).

| Review                                                                               | Result   | Evidence / issue                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Both invoice templates, one-page invoice                                             | Partial  | Classic template rendered from synthetic disposable data on 2026-10-24; one-page invoice inspected. Simple template not run. `/private/tmp/invoice-pdf-visual-check/one-page.pdf`.                                                                           |
| Both invoice templates, multi-page invoice and long descriptions                     | Partial  | Classic template rendered with 32 synthetic rows; two portrait pages, no blank page, rows and total visible. Simple template not run. `/private/tmp/invoice-pdf-visual-check/multi-page.pdf`.                                                                |
| Logo/font rendering, A4 dimensions, no clipping or unexpected scaling                | Partial  | Chromium print route visually inspected at 120 dpi. Both PDFs report 594.96 × 841.92 pt A4; header, table columns, row text and total fit. No logo supplied; issued-PDF QR assembly and ordinary screen preview were not visually exercised in this harness. |
| QR-bill is the final page                                                            | Observed | Disposable PDF has two pages; invoice first and QR-bill second. QR payload was not independently validated or scanned.                                                                                                                                       |
| QR payload validated by SIX/current standards validator                              | Not run  | Record validator URL/version, date, and sample ID.                                                                                                                                                                                                           |
| Printed code scanned; creditor, debtor, amount, currency, and message match snapshot | Not run  | Record scan result and sanitized sample ID.                                                                                                                                                                                                                  |

## Accessibility findings

This is an informal review, not a claim of WCAG conformance. Record each issue, affected view/theme, assistive technology and version, and whether it blocks review. Unchecked technologies remain untested.

| Platform/tool                                           | Result  | Findings / limitations |
| ------------------------------------------------------- | ------- | ---------------------- |
| macOS VoiceOver                                         | Not run |                        |
| Windows Narrator                                        | Not run |                        |
| Keyboard-only and visible focus, both platform builds   | Not run |                        |
| 200% text size and sticky Issue action visibility       | Not run |                        |
| WCAG 2.2 AA text contrast spot measurements, all themes | Not run |                        |

## Known blockers

- The invoice editor UX brief explicitly lists per-row service dates as unimplemented. They are not implemented by packaging work. Keep this as a release blocker unless the user explicitly removes the requirement from release scope.
- No Windows host or Windows VM build evidence is recorded in this workspace session.
- Neither platform has fresh-install workflow, restart/persistence, permission/conflict, accessibility, or appearance evidence recorded yet.
- The initial visual review of a disposable Classic invoice found horizontal clipping. A CSS correction was rebuilt and packaged smoke passed, but the corrected PDF still needs visual review. The simple template, SIX validator, and QR scanner have not been checked.
- The provisional icon has no recorded design approval.
- Settings still offers CSV selection and CSV creation actions that are also present in Customers; the invoice-editor UX brief says customer CSV setup belongs in Customers and Settings should show a read-only path.
- The DMG maker depends on an `image-size` release affected by a high-severity ICNS parser denial-of-service advisory. npm reports no fix. The current make flow processes the project-controlled icon; do not accept externally supplied ICNS files as build inputs, and reassess this dependency before public distribution.
- No trusted distribution signing or notarization is configured; these builds can trigger operating-system trust warnings and are not public-distribution ready.

## Release gate

Do not mark Phase 4 complete until both platform checklists contain evidence, automated validation passes, PDF/QR and accessibility findings are recorded, the service-date scope is resolved, and known blockers are fixed or explicitly accepted. Keep signing and notarization claims separate; no such credentials or configuration are present.
