# Release evidence — private review build

Status: **in validation; keep private**. This file distinguishes observed checks from unrun gates. Initial checkpoint: 2026-10-18. It is not a production-readiness claim.

| Gate | Status at restored milestone | Evidence |
| --- | --- | --- |
| Existing GitHub authentication / private repository | PASS | Owner `hardw00t`; existing `repo` scope; API `private:true`, visibility `private`, push permission true. No credentials created. Commit/push verification will be recorded after this checkpoint. |
| Typecheck and production build | PASS | `npm run build` completed before the execution-host disconnect. |
| Pure rules and real-PDF integration | PASS | `npm test`: 20 passed, 0 failed, including actual 500-page/501-page and 30 MiB/+1 byte input boundaries. |
| Real Chrome sample export | PASS | One Chrome test passed. Download reopened from disk; archive filenames, every output page count and original/exported first-page canvas equality checked. |
| Full browser error/correction/preset/cancel/offline/accessibility suite | NOT RUN | Source is present; execution service disconnected before the broader run started. |
| Browser large-batch memory/performance | NOT RUN | Not yet measured. No thousands-of-pages claim. |
| Dependency vulnerability and license review | PARTIAL | Installation reported zero advisories. Package inventory and production license texts generated; final explicit audits and asset-license review pending. |
| Security/threat model | WRITTEN; REVIEW PENDING | [THREAT-MODEL.md](THREAT-MODEL.md) |
| Other browsers / OS / assistive technology | NOT RUN | Chrome on local macOS is the current validation target. No broad compatibility or conformance claim. |
| Owner release-evidence review and permission to make public | PENDING | Repository must remain private. No hosting, remote CI, payments or outreach activated. |

The first real-browser attempt exposed PDF.js Window/DOM discovery inside the extraction worker. It failed visibly and produced no archive. The correction uses the public `PDFWorker.create({port})` API with text-only options; the subsequent sample flow passed. Unit tests also caught rejection of empty annotation arrays and malformed page-tree error handling; both were corrected before the passing run.

The execution host then disconnected before any commit was created. On resumption, source files, synthetic fixtures, the downloaded sample ZIP and its review screenshot were found in the same workspace. The immediate next action is to preserve this milestone in the existing private repository, then continue validation.

Known limits: 500 pages/30 MiB; no OCR or blank pages; no forms/signatures/annotations/attachments/layers/actions; exact markers can match repeated headers when configured poorly; operator review is required for semantic accuracy. Build emits a bundle-size advisory for PDF libraries. See the README and threat model.
