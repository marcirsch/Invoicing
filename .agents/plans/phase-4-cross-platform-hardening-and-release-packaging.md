# Feature: Phase 4 — Cross-Platform Hardening and Release Packaging

This plan covers Phase 4 of the Local Invoicing App MVP. Validate existing behavior before changing it, build release artifacts separately on macOS and Windows, and record platform-specific results. This phase creates reviewable local installers; publication, automatic updates, and signed public distribution remain out of scope until distribution identities and credentials are selected.

## Feature Description

Prepare repeatable macOS and Windows builds for user review. Add a packaging pipeline around the Electron Vite output, verify the packaged app on each operating system, exercise the complete invoicing workflow, review keyboard and screen-reader operation, and validate archive recovery and failure behavior. Review both invoice templates and multi-page PDFs, and verify QR-bill output with a standards validator and scanner before calling the app release-ready.

The app currently has a production build and development smoke test, but no installer configuration, icons, or platform release scripts. It already has hardened BrowserWindow preferences, packaged CSP, sender validation, local persistence, and journaled archive recovery; verify these in packaged contexts. Also confirm the separate invoice-row service-date requirement in `.agents/plans/invoice-editor-ux-prd.md` is implemented or explicitly removed from release scope; do not silently fold it into packaging work.

## User Story

As a small-business owner reviewing the MVP, I want installable macOS and Windows builds that preserve my data and complete the invoice workflow reliably, so that I can evaluate the app on the computers I use before release.

## Problem Statement

`npm run build` only creates Electron Vite output, and `npm run smoke` launches from the repository, so neither proves a fresh installation works. Windows has not been verified. Automated tests cover archive commit/no-overwrite but not journal recovery states, restarts, or failure boundaries. Visual PDF checks, QR-bill validation/scanning, and systematic accessibility checks also remain incomplete.

## Solution Statement

Use Electron Forge as the packaging layer around the current Electron Vite build. Add reproducible package/make scripts and platform-appropriate artifacts, using native macOS and Windows hosts or matching CI runners instead of relying on cross-compilation. Keep review artifacts unsigned unless signing credentials and distribution requirements are selected; do not claim public-distribution readiness for unsigned builds.

Add deterministic automated coverage for archive journal recovery and failure states using temporary directories and realistic fixtures. Extend smoke verification to launch a packaged artifact with isolated test user data. Run a manual end-to-end checklist on both operating systems covering install/launch/reopen, CSV paths and conflicts, editing and preview, issue/archive, permissions/failures, appearance, accessibility, and data preservation. Review PDF layouts and QR-bill payload/scan behavior independently of packaging.

## Feature Metadata

**Feature Type**: Hardening / Release Packaging  
**Estimated Complexity**: High  
**Primary Systems Affected**: Electron build configuration, package scripts, release assets, smoke tooling, archive recovery tests, accessibility, release documentation  
**Dependencies**: Electron Forge and makers compatible with Electron 44/electron-vite 5; native macOS and Windows build/test environments; optional signing credentials

---

## CONTEXT REFERENCES

### Relevant Codebase Files — Read Before Implementing

- `package.json` (lines 1–45) — Versions, scripts, no current package maker.
- `electron.vite.config.ts` (lines 1–24) — Build layout; preserve standalone CommonJS preload output.
- `scripts/smoke-test.mjs` (lines 1–66) — Existing repository-based smoke test; adapt its handshake/timeout pattern for a packaged app and isolated user data.
- `src/main/index.ts` (lines 11–55, 57–95) — Window security, navigation, smoke flag, CSP, test user-data override, lifecycle.
- `src/main/security/trustedSender.ts` (lines 1–15) and `src/main/security/validateIpcSender.ts` (lines 1–19) — Packaged file-URL sender trust.
- `src/main/services/invoiceArchiveStore.ts` (lines 9–190) — Journal states, atomic commit, no-overwrite, and recovery behavior.
- `src/main/services/invoiceIssuanceService.ts` (lines 22–143) — Issue ordering, retries, number advancement, draft clearing.
- `src/main/services/invoicePdfService.ts` (lines 1–50), `src/main/services/qrBillService.ts` (lines 1–25), `src/shared/invoice/qrBillData.ts` — PDF and QR generation/data mapping.
- `src/renderer/components/AppShell.tsx` (lines 1–82), `src/renderer/styles/global.css` (lines 11–38) — Navigation, appearance, baseline focus treatment.
- `tests/integration/invoiceArchiveStore.test.ts` (lines 1–93) — Temp-directory integration test and no-overwrite pattern.
- `tests/integration/ipcValidation.test.ts` (lines 1–54) — Security boundary test pattern.
- `tests/unit/invoicePageLayout.test.ts` — Deterministic pagination test; visual review remains necessary.
- `.agents/AGENTS.md` (lines 7–11, 85–107), `.agents/reference/electron.md` (lines 14–34), `.agents/reference/pdf-preview.md`, `.agents/reference/components.md` — Current release gaps and process/accessibility/PDF rules.
- `.agents/plans/invoice-editor-ux-prd.md` — Confirm the outstanding service-date requirement.
- `.codex/PRD.md` at `HEAD`, Phase 4 section — Original acceptance criteria; the worktree copy is deleted, so inspect history and do not restore it accidentally.

### New Files to Create or Update

- `forge.config.ts` (or selected Forge-supported module format) — Identity, makers, icons, signing sourced only from external credentials.
- `resources/icons/` — Approved `.icns` and `.ico` assets if none exist.
- `scripts/smoke-packaged.mjs` — Launch actual packaged artifact with temporary user data and check renderer/preload handshake.
- `tests/integration/invoiceArchiveStore.test.ts` — Recovery state/failure integration coverage; add/extend issuance test as needed.
- `docs/release-validation.md` — Build instructions, test matrix, artifact names, unsigned-build limits, evidence checklist.
- `package.json`, `README.md`, `.agents/AGENTS.md` — Packaging scripts/dependencies and accurate guidance/status.

### Relevant Documentation

- [Electron Packaging Your Application](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging) — Official Forge setup, package/make outputs, makers, icons, signing.
- [Electron Forge Build Lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle) — Package/make behavior and native-host/cross-platform constraints.
- [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing) — macOS signing/notarization and Windows signing; separate review builds from public distribution.
- [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/) — Keyboard (2.1.1), focus visible (2.4.7), focus not obscured (2.4.11), contrast (1.4.3), labels/errors (3.3.1–3.3.2), status messages (4.1.3). This is a review baseline, not a claim of formal conformance.
- [SIX QR-bill standards page](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html) — Check the guideline version effective at test/release time and use an appropriate validator/scanner.

### Patterns to Follow

- Preserve Electron Vite output paths and production dependencies; keep dev/build behavior intact. Read the selected Forge version's docs before choosing config keys/makers.
- Build macOS and Windows artifacts on native hosts or matching CI runners; name artifacts with app version/platform/architecture.
- Use `node:fs/promises`, `node:os`, `node:path`, `mkdtemp`, and `afterEach` cleanup as in the archive integration test.
- Create realistic journal/index/PDF fixtures, call public `recover()` or `list()`, and assert index/PDF/journal state. Avoid test-only production flags.
- Preserve safe IPC errors, drafts after failed issuance, and no-overwrite semantics.
- Keep native semantic controls and visible focus. Review keyboard access, error associations, status announcements, focus near sticky Issue action, contrast in System/Light/Dark.
- Store no certificate/password/Apple credential/signing token in source. Unsigned status must be explicit.

---

## IMPLEMENTATION PLAN

### Phase 1: Packaging foundation

- Confirm product name, bundle identifier, architecture targets, approved icon source, and review artifacts. Default to a macOS disk image and Windows installer, with a zip/portable artifact if supported by selected makers.
- Add Electron Forge around the current Vite build; package all needed assets and runtime dependencies.
- Add reproducible native-host package/make commands. Leave signing optional and externally configured.
- Add packaged smoke verification using isolated temporary user data.

### Phase 2: Recovery and failure coverage

- Cover each journal state and combinations of final PDF, temp PDF, and archive index.
- Cover interrupted writes, unreadable/invalid journal, target conflict, missing expected PDF, idempotent recovery, issue retry by transaction ID, and draft retention on issue failure.
- Fix only verified defects consistent with existing invariants: no silent loss, no overwrite, one stable record, retryable recovery, safe error.

### Phase 3: Platform and product validation

- Install and launch native artifacts on clean macOS and Windows environments.
- Exercise CSV-to-archive workflow, Unicode/spaces in paths, cancellation, missing/read-only files, external CSV edits, restart, permissions, and app-data persistence.
- Review keyboard/screen-reader operation, labels/errors, focus, contrast, System/Light/Dark.
- Review both templates at one and multiple pages, long descriptions, logos, and QR page order. Validate QR payload and scan codes against current SIX guidance.

### Phase 4: Documentation and readiness gate

- Record OS/version/architecture, artifact name/checksum, commands, test data, results, and known issues per platform.
- Update README/AGENTS with build instructions and verified status for signing, visual checks, QR validation, recovery tests, accessibility, and Windows.
- Mark complete only when acceptance evidence exists for both OSes and blockers are resolved or explicitly accepted.

---

## STEP-BY-STEP TASKS

### 1. UPDATE `package.json` AND CREATE `forge.config.ts`

- **IMPLEMENT**: Add Forge CLI and makers needed for chosen review artifacts. Add scripts for Vite build, package, make, and native platform builds. Preserve `dev`, `build`, `smoke` semantics.
- **PATTERN**: Existing package scripts and `electron.vite.config.ts` output paths.
- **IMPORTS**: Use the Forge API/module format supported by the selected compatible release; consult current official docs.
- **GOTCHA**: Set stable reverse-DNS bundle identifier and product name. Ensure packaged paths still resolve for renderer, preload, and `app.getAppPath()` IPC trust.
- **VALIDATE**: `npm run typecheck && npm run build && npm run lint && npm run format:check`.

### 2. CREATE PLATFORM ICONS AND CONFIGURE OUTPUT METADATA

- **IMPLEMENT**: Add approved `.icns`/`.ico` icons and artifact names containing product, version, OS, architecture.
- **PATTERN**: Forge maker/packager configuration from official docs.
- **GOTCHA**: No default Electron icon, machine-specific path, or signing secret in config.
- **VALIDATE**: Native build each target; inspect product name/icon in Finder and Windows Explorer.

### 3. CREATE `scripts/smoke-packaged.mjs`

- **IMPLEMENT**: Launch the actual package with a unique temporary user-data directory via `INVOICING_TEST_USER_DATA_PATH` or a safer smoke-only mechanism. Assert success sentinel, enforce timeout, surface stdout/stderr, clean only the created temp directory.
- **PATTERN**: `scripts/smoke-test.mjs`, `src/main/index.ts:28-45,70-74`.
- **GOTCHA**: Never smoke-test against the user's normal profile. Test packaged output, not repository app entry.
- **VALIDATE**: `npm run build && npm run make:<platform> && npm run smoke:packaged` (use actual names defined in Task 1).

### 4. ADD ARCHIVE RECOVERY INTEGRATION TESTS

- **IMPLEMENT**: Extend archive tests for prepared/no-final cleanup; pdf-written/temp recovery; final PDF/index recovery; already-indexed journal cleanup; malformed journal; conflicting PDF/no-overwrite; idempotence. Add issuance retry/draft-retention test if missing.
- **PATTERN**: Temp directories/cleanup in `tests/integration/invoiceArchiveStore.test.ts`; service order in `src/main/services/invoiceIssuanceService.ts`.
- **GOTCHA**: Preserve issued PDF and snapshot. Do not bypass public recovery or production validation.
- **VALIDATE**: `npx vitest run tests/integration/invoiceArchiveStore.test.ts` plus the discovered issuance integration test file.

### 5. FIX VERIFIED RECOVERY OR PLATFORM DEFECTS

- **IMPLEMENT**: Make smallest service-level fixes; retain journal/PDF/index ordering, no overwrite, safe IPC failures. Add a regression case per fix.
- **PATTERN**: `src/main/services/invoiceArchiveStore.ts:59-190`, `src/main/services/invoiceIssuanceService.ts:34-143`, `src/main/ipc/registerHandlers.ts:85-96`.
- **GOTCHA**: Filesystem rename/replace behavior can differ on Windows; verify on both OSes.
- **VALIDATE**: `npm run typecheck && npm run lint && npx vitest run tests/integration/invoiceArchiveStore.test.ts <issuance-test-file>`.

### 6. COMPLETE ACCESSIBILITY AND RESPONSIVE REVIEW

- **IMPLEMENT**: Fix verified issues in keyboard access, visible focus, semantic labels, error associations, announcements, contrast, text resizing, and focus hidden by persistent UI. Keep invoice-paper styling independent of app theme.
- **PATTERN**: `.agents/reference/components.md`, `AppShell.tsx`, editor validation relationships, `global.css:11-38`.
- **GOTCHA**: Do not claim formal WCAG conformance from an informal review; report untested assistive technology and exceptions.
- **VALIDATE**: Manual keyboard-only and 200% text-size review; record VoiceOver/Narrator spot checks and contrast measurements.

### 7. RUN END-TO-END MATRIX ON MACOS AND WINDOWS

- **IMPLEMENT**: Install each native artifact; create/select CSV, add/edit customer, edit/preview/issue invoice, open/reveal archived PDF, restart, verify settings/draft/archive persistence. Exercise cancellation, Unicode/spaces, external CSV conflict, unavailable archive, permission failures, appearance modes.
- **PATTERN**: `.agents/reference/electron.md:23-34` and current app workflows.
- **GOTCHA**: Use disposable test data and temporary archives; don't issue into the user's real archive.
- **VALIDATE**: Complete one release checklist per OS; retain screenshots/PDF evidence only from disposable data.

### 8. VERIFY PDF AND QR-BILL

- **IMPLEMENT**: Inspect both templates at one/multiple pages, long descriptions, logos/fonts. Confirm scaling is screen-only, pages remain A4, QR-bill is last. Validate and scan QR payload; compare creditor/debtor/amount/currency/message with issued snapshot.
- **PATTERN**: `.agents/reference/pdf-preview.md`, PDF/QR services, `src/shared/invoice/qrBillData.ts`.
- **GOTCHA**: Check SIX guidance effective on test date; do not trust stale PRD version timing.
- **VALIDATE**: Record validator/date/version, sample ID, page order, payload and scan result.

### 9. UPDATE RELEASE DOCUMENTATION

- **IMPLEMENT**: Document platform prerequisites, native build commands, outputs, smoke test, test matrix, unsigned limitations; update current state only after evidence. Resolve service-date requirement for release.
- **PATTERN**: README, AGENTS, invoice editor UX brief.
- **GOTCHA**: `.codex/PRD.md` is deleted in the worktree. Do not restore or overwrite this user change; update it only through a separate explicit decision.
- **VALIDATE**: `npm run format:check && git diff --check && git status --short`.

---

## TESTING STRATEGY

### Automated tests

Test archive recovery state transitions, invalid journals, idempotence, archive/PDF/index consistency, no-overwrite, issue retry, and draft retention. Launch the actual packaged artifact with isolated data and check preload/renderer initialization. Run the existing full suite and smoke test.

### Manual platform integration

On native macOS and Windows environments, test fresh install, relaunch, native dialogs, Unicode/spaced paths, cancellation, read-only/permission failures, external CSV conflicts, moved/missing CSV/archive, appearance, PDF generation, open/reveal, and persistence.

### Accessibility

- All actions operable by keyboard with visible focus and no trap.
- Errors identify controls in text and are announced; focus is not hidden by sticky UI.
- Labels/headings describe purpose; controls remain usable at increased text size.
- Check WCAG 2.2 AA text contrast (4.5:1, or 3:1 for large text) where applicable across themes.
- Screen-reader spot check with VoiceOver on macOS and Narrator on Windows; document limitations.

### Edge cases

- `prepared` without temp/final file; `pdf-written` with temp; final PDF with missing index; indexed record with stale journal.
- Malformed journal, missing expected PDF, existing conflicting PDF, unwritable archive/app-data path.
- Restart at each journal transition; repeat transaction ID; preserve draft on failed issue.
- CSV/archive moved, deleted, read-only; cancelled dialog; Unicode/spaced paths.
- Short/long invoices, both templates, page order, QR totals/currency, app theme independent of printed invoice.
- Packaged app has no dev URL and includes all required assets/dependencies.

---

## VALIDATION COMMANDS

Use exact Forge script names configured in Task 1.

### Syntax, types, style

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `git diff --check`

### Targeted and full tests

- `npx vitest run tests/integration/invoiceArchiveStore.test.ts`
- `npx vitest run tests/integration/<issuance-test-file>`
- `npm test`
- `npm run build`
- `npm run smoke`
- Native `npm run make:<platform>` and `npm run smoke:packaged` on each OS.

### Manual release validation

Fresh install/workflow on both OSes; accessibility/theme review; PDF/QR validator and scanner checks; restart/recovery/failure/data preservation. Record OS/version, app version, artifact SHA-256, and known failures.

---

## ACCEPTANCE CRITERIA

- [ ] Reproducible macOS and Windows distributables build on native hosts using documented commands.
- [ ] Packaged app has intended product name/icon and all required assets/dependencies.
- [ ] Packaged smoke test launches the actual artifact with temporary data and confirms preload API availability.
- [ ] Fresh install, launch, restart, and expected app-data location are verified on both platforms.
- [ ] CSV → edit → preview → issue → archived PDF workflow succeeds on both platforms.
- [ ] Cancellation, Unicode/spaced paths, permission errors, CSV conflicts, moved files, and archive failures recover without silent data loss.
- [ ] Recovery states are covered; recovery is idempotent and never overwrites an existing PDF; failed issue retains retryable draft.
- [ ] Both templates work for one/multiple pages; output is A4 and QR-bill is final.
- [ ] Current QR validator/scanner confirms payload matches issued snapshot and effective SIX guidance.
- [ ] Accessibility review checks keyboard, focus, labels/errors, sticky-action visibility, and contrast across themes; limitations are recorded.
- [ ] Service-date requirement is implemented or explicitly removed from release scope.
- [ ] README/guidance distinguish verified behavior, unsigned review builds, and remaining blockers.
- [ ] No public signed-distribution claim without configured and verified signing/notarization.

## COMPLETION CHECKLIST

- [ ] Packaging config and platform icons added.
- [ ] Native macOS and Windows artifacts built and inspected.
- [ ] Packaged smoke passes on both systems.
- [ ] Recovery/issue failure tests and full automated validation pass.
- [ ] Manual end-to-end workflow passes on both systems.
- [ ] PDF/QR and accessibility findings are documented.
- [ ] README/AGENTS reflect verified state.
- [ ] Signing status and service-date scope are resolved or explicitly documented as blockers.

## NOTES

- Electron recommends Electron Forge. Forge package/make normally targets the host OS; use native hosts or matching CI runners for reliable builds.
- Public signing/distribution is unspecified: no certificates, Apple identity, Windows signing provider, or publishing channel are selected. Keep review builds unsigned and offer a separate plan if public distribution is required.
- There is no CI configuration in this repository. A CI build matrix can be added for repeatability, but must not replace installer testing on each OS.
- Preserve existing local documentation changes (deleted `.codex/PRD.md`, untracked plans); only add this plan.
