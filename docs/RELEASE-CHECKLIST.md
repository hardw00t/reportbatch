# Release evidence — private review build

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
