# Release evidence — private review build

## Latest import/boundary acceptance — 2026-10-18 18:46 UTC

35 Node tests and production build pass (offline packaging previously validated with33tests). A new identifying-field clipping defect was fixed: a surname intersecting the region with its center outside is now blocked rather than silently omitted. Unit and real-PDF export-blocking regressions pass; updated live browser retest is required. Live synthetic imports, preset round-trip/rejection, grouped6page/3output export,500report export, exact30MiB export,501page/+1byte rejection, Unicode export and unsupported-file recovery pass on deployed index-Vpo0mRBu.js. All505 downloaded PDFs independently reopen with matching hashes/counts and ordered source partitions.500report import-to-download24.929s includes review/tool time; browser memory unmeasured. See [import evidence](IMPORT-BOUNDARY-QA.md).

Additional live evidence: rotated/cropped export with adjusted numeric regions preserves geometry and pixel-identical Poppler rendering; native200%/400% zoom has no document horizontal overflow (local table scrolling remains). See [rotation and zoom](ROTATION-ZOOM-QA.md).

Still open: runtime network/storage/host-header observation (native DevTools explicitly blocked by organization; no bypass), browser memory, full accessibility/mobile/zoom, mixed-size export visual fidelity, disconnected-browser workflow and final acceptance. Source privacy review and local server tests do not close runtime gates. No new production-readiness claim.


## Latest acceptance evidence — 2026-10-18 17:52 UTC

**Still not production-ready.** Private source remains private; public synthetic preview version 3 is authorized testing only. Source `09f8324`, directly observed browser asset `index-Vpo0mRBu.js`.

- PASS: 32 Node tests, production build/typecheck/CSP guard, owner-authorized dependency audit with zero advisories.
- PASS on the new live preview: invisible file-input Tab stops removed; visible upload/sample buttons remain reachable; keyboard sample → preflight → review → actual ZIP export succeeds. Four downloaded PDFs independently reopen with matching hashes, page counts and ordered source partition.
- PASS, bounded: 485–500 px native desktop-window reflow/no overflow, 42-stop keyboard traversal without a trap, limited text contrast sample. **Not mobile-device validation or accessibility certification.**
- OPEN: supported preset/PDF import tests; full automated browser suite and axe/screen-reader checks; mobile/touch/320–375 px and zoom reflow; full request/storage canary validation and public-host header verification; large-fixture browser timing/memory/cancellation; broader browsers and visual fidelity. Prior aborted import must not be retried without renewed approval.
- NEXT: follow [remaining validation checklist](NEXT-VALIDATION.md). Do not substitute Node benchmarks or source inspection for the browser gates.


## Latest local hardening — 2026-10-18 17:49 UTC

Node checks are now **32/32 passing**, including executable local static-server security/privacy assertions. Production build/typecheck and new CSP/referrer build guard pass. Owner-authorized fresh npm audit returned zero advisories. Independent source privacy review found no application document-upload/automatic-persistence path; this is not runtime proof. Production-only CSP and invisible keyboard Tab stops were fixed, with stronger browser-network/canary regressions added. These changes still need live browser retest; automated Chromium continues to fail before assertions on local socket permissions. Public-host security headers, full mobile/a11y/import/privacy and browser-performance gates remain open. See [VM validation](VM-VALIDATION.md).

## Earlier live verification — 2026-10-18 15:18 UTC

Public synthetic test preview is deployed under owner authorization; source repository remains private. [Live browser QA](LIVE-BROWSER-QA.md) records passing correction alignment, required-field blocking, restored-value export, independently reopened PDF/hash/page checks, clear/reset, cancellation/recovery and limited keyboard smoke checks. Final Node suite is 31/31 passing with build/typecheck passing. Full browser suite, mobile, accessibility, network/privacy and browser performance gates remain incomplete. This is not production acceptance.

## Earlier VM status — 2026-10-18

**Not release ready; repository remains private.** Latest evidence: [VM validation](VM-VALIDATION.md). Mac results below are historical and do not validate subsequent source changes.

- PASS: final Node suite **29/29**, including 2,500 seeded filename cases, 400 marker partitions, 100 deterministic planning/correction cases, nested preset validation, real-PDF regressions and size/page boundaries.
- PASS: production typecheck/build. Large PDF-library bundle advisory remains.
- PASS, narrow scope: synthetic Node-only 500-output export and independent reopen/page-partition verification in 3.49 seconds; peak Node RSS 670,624 KiB including fixture creation. This does not establish browser performance.
- FIXED WITH NODE REGRESSIONS: region-scoped marker reconstruction, UserUnit text widths, reserved/truncated names and Unicode collision keys, active presentation steps, article beads, private application metadata, and extra hidden Page objects in copied output graphs.
- TYPECHECKED / READ-ONLY REVIEWED, BROWSER UNRUN: delayed sample/preset operation guards, cancellation, double-click protection. Browser regression added.
- BLOCKED: final browser workflow, accessibility/mobile, keyboard/download and browser resource/performance suites. Chromium local-socket startup and escalation launcher failed; supported dot browser could not reach the exec-local server despite an HTTP 200 readiness check in that server's session.
- LIMITATION: split PDFs are not a sanitization or confidentiality boundary; shared resources/non-visible content can remain. No comprehensive hostile-PDF security claim.
- PENDING: complete browser/visual checks, broader platform/assistive-technology checks, and owner release review/authorization. No hosting, remote CI, payments or outreach enabled.

## Historical Mac checkpoint

Status: **in validation; keep private**. Mac work stopped for cloud handoff at the user's request on 2026-10-18. This file distinguishes observed checks from unrun gates. It is not a production-readiness claim. See [HANDOFF.md](HANDOFF.md).

| Gate | Status at restored milestone | Evidence |
| --- | --- | --- |
| Existing GitHub authentication / private repository | PASS | Owner `hardw00t`; existing `repo` scope; API `private:true`, visibility `private`, push permission true. Milestone `57d09375eec8bea671d745655d5e72ca47d44069` pushed and remote SHA verified after reconnection. No credentials created. |
| Typecheck and production build | PASS | Latest `npm run build` passed after the final accessibility/mobile candidate fixes. PDF-library bundle-size advisory remains. |
| Pure rules and real-PDF integration | PASS | `npm test`: 20 passed, 0 failed, including actual 500-page/501-page and 30 MiB/+1 byte input boundaries. |
| Real Chrome sample export | PASS | One Chrome test passed. Download reopened from disk; archive filenames, every output page count and original/exported first-page canvas equality checked. |
| Broader real Chrome suite | PARTIAL; FINAL RERUN REQUIRED | First full run: 6 passed, 3 failed in 1.3 minutes. Passing: sample export/render comparison, field corrections/collisions, preset lifecycle, rejection errors, cancellation/retry/double export, offline/no persistence. Failing: marker test selector, accessibility, mobile overflow. |
| Marker grouping browser retest | PASS | After selector correction, actual marker export and no-marker/orphan blocking test passed. Tested ranges 1–2, 3, 4–6. |
| Accessibility and keyboard path | FAIL AT LAST RUN; CANDIDATE FIX UNVERIFIED | Contrast findings were corrected; retest got past contrast but still failed the brand accessible-name override. Final code removes that override and adds explicit visible spacing. No subsequent browser run. Keyboard flow beyond the early scan therefore remains incomplete. |
| Mobile drawing/layout | FAIL AT LAST RUN; CANDIDATE FIX UNVERIFIED | Drawing and preflight passed; overflow assertion found two visually hidden file inputs extending to 406 px on a 390 px viewport. Final CSS constrains those inputs to 1 px at the origin. Not rerun. Existing mobile screenshots predate this final fix and are not passing-QA evidence. |
| Browser large-batch memory/performance | NOT RUN | `tests/e2e/performance.spec.ts` added and typechecked. Actual browser RSS, 500-report export, and 30 MiB browser scenarios have not run. Node boundary tests passed. No thousands-of-pages claim. |
| Dependency vulnerability and license review | PASS WITH STATED LIMITS | Explicit full `npm audit` reports zero advisories in [npm-audit.json](evidence/npm-audit.json). [Dependency review](DEPENDENCY-REVIEW.md) and font-source/license hashes recorded. This is not a guarantee of absence of vulnerabilities or a legal opinion. |
| Security/threat model | WRITTEN; REVIEW PENDING | [THREAT-MODEL.md](THREAT-MODEL.md) |
| Other browsers / OS / assistive technology | NOT RUN | Chrome on local macOS is the current validation target. No broad compatibility or conformance claim. |
| Owner release-evidence review and permission to make public | PENDING | Repository must remain private. No hosting, remote CI, payments or outreach activated. |

The first real-browser attempt exposed PDF.js Window/DOM discovery inside the extraction worker. It failed visibly and produced no archive. The correction uses the public `PDFWorker.create({port})` API with text-only options; the subsequent sample flow passed. Unit tests also caught rejection of empty annotation arrays and malformed page-tree error handling; both were corrected before the passing run.

The execution host initially disconnected before any commit was created. On resumption, source files, synthetic fixtures, the downloaded sample ZIP and its review screenshot were found in the same workspace, then milestone `57d0937` was pushed and verified. Broader validation exposed the findings above. The user subsequently requested moving work off the Mac. Current work is being checkpointed for that transfer; no further Mac feature/test expansion is authorized.

Known limits: 500 pages/30 MiB; no OCR or blank pages; no forms/signatures/annotations/attachments/layers/actions; exact markers can match repeated headers when configured poorly; operator review is required for semantic accuracy. Build emits a bundle-size advisory for PDF libraries. See the README and threat model.
