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
