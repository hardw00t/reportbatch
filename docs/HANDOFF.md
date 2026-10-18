# Cloud continuation handoff — 2026-10-18

The user requested moving development off their laptop. **Stop all Mac feature/test work after this checkpoint.** Continue on a separate authorized cloud execution environment using the private GitHub repository. Do not change repository visibility or transfer credentials. No remote CI, spending, new accounts/credentials, hosting, checkout or outreach is authorized.

Repository: https://github.com/hardw00t/reportbatch — private. Branch: `main`. First verified milestone: `57d09375eec8bea671d745655d5e72ca47d44069`. The next commit contains this handoff and all current authorized source/tests/docs; its exact remote SHA is supplied in the task's final response.

## Saved implementation

Browser-local React/TypeScript workbench with PDF.js preview and geometric text extraction, prefix/region rules, explicit one-page or exact-marker grouping, required fields, manual corrections, collision/traversal-safe filenames, versioned local presets, full-batch page partition checks, and worker-based PDF/ZIP creation/reopening/count/hash checks. Originals are read-only; document content stays in memory. Synthetic samples, rejection/Unicode/geometry fixtures, source hashes, license notices, commercial hypothesis and threat model are committed.

The default supported scope is 1–500 searchable pages and up to 30 MiB, with additional safety limits documented in the README. Scans/blank pages, encrypted files and interactive/attached PDFs are deliberately unsupported. There is no OCR or cloud integration. This is a private review build, not a release-ready claim.

## Environment used

- macOS 26.6.2, ARM64.
- Node v26.11.0; npm 11.20.0; Git 2.54.0 (Apple Git-157); GitHub CLI 2.102.0.
- Google Chrome 155.0.8059.80; Playwright 1.64.1.
- React 19.3.1, Vite 8.3.4, TypeScript 7.0.2, PDF.js 6.4.299, pdf-lib 1.17.1, fflate 0.8.3.
- Python 3.14.8 / pypdf 6.15.0 were used only to generate the checked-in synthetic encrypted rejection fixture. Python is not an app/build dependency.

No existing browser profile was automated: Playwright used temporary Chrome profiles. No global Git/user settings were changed. Commits used per-command author configuration and an existing GitHub credential helper. Do not copy local auth/configuration files into the VM.

## Exact validation state

1. `npm test`: **20 passed, 0 failed** before the disconnect. Core PDF/rule code has not changed since that passing run. Includes actual Node load boundaries at 500/501 pages and 30 MiB/+1 byte, Unicode extraction, literal dates, page lineage, generated PDF/ZIP reopening, cancellation/retry, corruption/encryption and unsupported features.
2. `npm run build`: **passed on the final current source**, including typechecking the new performance tests. Large PDF-library chunk advisory remains.
3. First full `npm run test:e2e`: **6 passed, 3 failed**. The passing tests cover sample export/download/render equality, missing/ambiguous corrections and collisions, preset lifecycle, unsupported inputs, cancellation/retry/rapid double export, and offline export with no document persistence/network transmission observed in that scenario.
4. Targeted rerun `npm run test:e2e -- --grep 'marker boundaries|keyboard path|mobile layout'`: **1 passed, 2 failed**. The marker test passed after its accessible-name selector was corrected. Accessibility and mobile remained failed at that run; see next section.
5. `npm audit --cache .cache/npm --json`: **zero advisories at every severity**. Snapshot in `docs/evidence/npm-audit.json`. Package/font/asset licenses reviewed and documented in `docs/DEPENDENCY-REVIEW.md`.
6. `npm run test:perf`: **not run**. Tests are written/typechecked, not evidence of measured performance. Actual Chrome RSS/500-report and 30 MiB browser scenarios remain pending.
7. Other browsers/OS, manual assistive-technology checks, full keyboard walkthrough, broader visual fidelity, generated-output 200 MiB cap stress case and hostile-PDF resilience: **not run**. Do not infer these passed from builds or the sample flow.

## Outstanding defects and candidate fixes

- Axe's empty-state contrast findings were fixed by darkening secondary text. The targeted rerun got past contrast but failed the brand's accessible-name override. The final change removes that override and inserts visible spacing between `ReportBatch` and `LOCAL EDITION`; **not rerun**. Configured/review accessibility scans and the complete keyboard-to-download path still need to execute.
- Mobile drawing and preflight worked, but document width was 406 px at a 390 px viewport. DOM diagnostics identified two `input.sr-only` file controls enlarged by the global input width rule. The final CSS explicitly constrains them to 1 px at left/top zero; **not rerun**. `docs/evidence/review-mobile.png` and `empty-mobile.png` are earlier snapshots, not evidence that the final fix passed.
- Marker grouping test initially searched for `02 Split`, while the accessible text was `02Split`. Numeric decorations are now aria-hidden and the test selects `Split`. That actual marker/orphan/no-marker flow **passed** on retest.
- Full final regression run, browser performance measurements and release-owner review remain release blockers. Repository must stay private.

## Commands for the next environment

Clone with the cloud environment's existing authorized GitHub access; do not export Mac credentials. From the cloned checkout:

```sh
npm ci
npm run build
npm test
npm run test:e2e
npm run test:perf
```

The default browser channel is installed Chrome. If the VM has only Playwright Chromium, install from Playwright's official free distribution as authorized by that environment, then run `PW_CHANNEL=chromium npm run test:e2e` and `PW_CHANNEL=chromium npm run test:perf`. The test runner owns the loopback server at port 4173 and stops it on completion; it tests `dist/`, so rebuild after source edits. `npm run serve` is the manual production loopback preview. `npm run dev` uses port 5173. No remote hosting is needed.

Performance RSS sampling uses `ps` with process IDs obtained from Chrome CDP. It is an aggregate RSS approximation that includes shared pages, not a precise heap measurement; record platform-specific behavior instead of inventing results. The boundary fixture generator keeps large PDFs in test memory and does not commit them.

Generated caches, `node_modules/`, `dist/`, Playwright reports/traces and `.env*` are Git-ignored. Only intentionally generated synthetic fixture/evidence files are committed. Stop local preview/test servers before another environment takes ownership, and avoid concurrent branch writes.

## Research correction

`docs/COMMERCIAL-HYPOTHESIS.md` records live public sources and a proposed US$149 configured-layout service, explicitly unvalidated and inactive. The invoice job's live page currently shows a US$100 awarded proposal; the supplied earlier US$150 awarded figure was not confirmed (US$150 appears on other proposals). No buyers were contacted or served and no customer files were copied.
