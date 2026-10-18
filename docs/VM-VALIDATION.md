# VM validation checkpoint — 2026-10-18

Private review build; not release ready. Source migrated from `c2d55fb854b1c7c51808437384ecc828b77b49f3` through authenticated GitHub tools; all 61 blob hashes and root tree `4d0c3ae2049d8130d9c516a092c0097c2dd94c20` verified. No credentials transferred. A subsequent workspace reset lost unpushed work; the checkpoint was restored and verified again. Runtime persistence is not guaranteed.

## Confirmed fixes and evidence

- Marker reconstruction now filters tokens by the selected region before building lines; outside same-baseline text cannot hide a marker. Clipped region text blocks the batch.
- Windows device-name protection runs after truncation/trim; collision keys normalize again after case conversion.
- Text advance includes viewport scaling, retaining clipping checks for PDF UserUnit values.
- Reject presentation-step actions (`PresSteps`) and article-thread references (`Threads`/`B`). Article bead graphs could otherwise copy hidden content from other reports despite correct visible page counts.
- Full Node suite: **24 passed, zero failed**, including new synthetic regressions, actual PDF loading/export rejection, 500/501 pages, and 30 MiB/+1 byte.

## Unfinished validation

Browser tests did not execute application assertions on this VM: Chromium startup failed because a local socket was disallowed; the escalation launcher failed before execution. A supported cloud-browser attempt could not reach the loopback server. These are environment blockers, not passing browser evidence. Performance, final accessibility/mobile checks, broader visual fidelity, and UI async-operation race fixes remain pending. Earlier Mac observations in HANDOFF.md remain historical only. No public release, hosting, paid services, customer documents, or outreach occurred.

## Second safety checkpoint

- Added conservative PieceInfo rejection and a cycle-safe scan of all generated/reopened PDF objects, nested dictionaries, arrays and stream dictionaries. Every `/Type /Page` dictionary must be one of the output page-tree nodes. Synthetic direct and cyclic hidden-page references are rejected.
- Full Node suite: **25 passed, zero failed**. Production typecheck/build passed. This is not a guarantee that PDFs contain only visible report content: shared resources, unused XObjects and private metadata may contain non-visible content without extra Page dictionaries. This tool is not a redaction or sanitization service. Do not use split output as a confidentiality boundary for untrusted documents.
- Sample fetching and preset reading now use an immediate operation latch and generation checks. Cancellation aborts an outstanding sample request. Added delayed-sample/double-click/cancel regression to the browser suite; **not run due to the recorded browser environment blocker**. These UI fixes are typechecked, not browser-validated.
- `PW_EXECUTABLE_PATH` optionally selects an installed Chromium binary for test environments; it does not change browser/system settings.

## Node-only 500-report measurement

`node --import tsx scripts/benchmark-node.ts` completed on Linux x64 / Node 24.19.0: load 1,667 ms, preflight 17 ms, export 1,730 ms, total including independent PDF reopening 3,491 ms. All 500 PDFs reopened with one page each and source partition 1–500 verified. Peak Node-process RSS was 670,624 KiB (includes fixture generation). [Machine-readable evidence](evidence/performance-node-500.json). This synthetic Node result does not establish browser memory/performance, customer-file behavior, visual equivalence or a general service-level guarantee.

After restoring the workspace, a bounded supported browser retry again returned connection refused even though the server readiness probe in its own execution session returned HTTP 200 and expected security headers. The temporary server was stopped. Browser validation remains blocked.

## Deterministic property regressions

Final `npm test`: **29 passed, zero failed**, including 2,500 seeded Unicode/path/device-name filename cases, 400 randomized exact-marker partitions/orphan cases, 100 deterministic planning/manual-correction identity cases, and nested preset allowlist/nonfinite geometry checks. Random seeds are fixed in `tests/property.test.ts`; no customer data or new testing dependency is used. These are bounded regressions rather than exhaustive proofs. RELEASE-CHECKLIST.md now distinguishes current VM results from historical Mac results.

## Correction review synchronization — 2026-10-18

Live preview QA reproduced a mismatch after selecting report 003, editing a correction and rechecking: the inspector reset to report 001 while the source preview remained on page 3. Recheck now preserves the selected report when present, synchronizes preview to its first page, and shows its table page. If changed grouping removes the selection, both inspector and preview fall back to the first output; a new document starts at its first output. Added two Node state regressions and a browser workflow covering valid and blank/blocked corrections. Final Node suite: **31/31 passed**; production build passed. Live browser regression on this new checkpoint remains pending republication/retest; previous environment-blocker notes above are historical, as separate public-preview QA is now operating under owner authorization. The GitHub repository remains private.

## Privacy, local-server and keyboard hardening — 2026-10-18 17:49 UTC

- Fresh full Node suite **32/32 passed** and production build/typecheck passed. A new local-only server regression checks GET/HEAD, rejects POST/PUT and hostile Host values, blocks encoded/hidden/traversal paths, verifies CSP/no-store/no-referrer/nosniff/frame headers, and confirms request paths are not logged. It uses only temporary synthetic files and shuts its server down.
- The owner explicitly approved sending dependency names/versions to registry.npmjs.org for this check. Fresh `npm audit` succeeded with **zero advisories at every severity**; the unchanged JSON snapshot remains in `docs/evidence/npm-audit.json`. This registry result is not a security guarantee.
- Independent source review found no application upload, telemetry, third-party runtime URL, or automatic document persistence path. Explicit layout-only localStorage saves remain the sole app persistence; export manifests intentionally contain sensitive identifying fields. Source review is not browser runtime proof.
- Removed the development localhost WebSocket exception from production HTML CSP. A serve-only Vite transform retains HMR access in development. Every build now checks production connect-src is only self, no WebSocket/eval exceptions ship, and no-referrer remains.
- Live QA found invisible keyboard stops on the clipped PDF/preset inputs. Both now have tabIndex -1; their visible Choose/Change/Import buttons remain keyboard-operable. Browser assertions added; live retest on this checkpoint is pending.
- Strengthened the browser network/privacy regression: allow only exact built-asset paths with no queries; load a synthetic filename/extraction canary and apply a correction canary; assert none occurs in captured requests; check storage after export/reset. This enhanced regression is written/typechecked, **not executed** here.
- A bounded normal Chromium retry still failed before assertions with local socket Operation not permitted. No launcher escalation or denied import action was retried. Full automated browser, mobile/accessibility, import/privacy and browser-performance acceptance remains incomplete. Local server headers are not proof of public-host headers; deployment documentation now distinguishes those environments.
