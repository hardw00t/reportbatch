# Threat model and safety boundaries

## Assets and trust boundaries

The source PDF, field text, proposed names, manual corrections and audit manifest may contain confidential information. Untrusted inputs include PDF object graphs/content streams/fonts/images, filenames and imported preset JSON. The browser/OS, installed extensions and local application origin are trusted execution infrastructure. This is a local utility, not an isolated malware-analysis environment or a secure viewer for adversarial PDFs.

The only normal network boundary is fetching static app/font/codec assets and the optional synthetic sample from the same loopback origin. There are no document HTTP requests, API keys, telemetry, account system, cloud integrations or upload endpoints. The included server binds `127.0.0.1`, validates Host, accepts GET/HEAD only, rejects hidden/traversal paths, and sends CSP/nosniff/frame/referrer/permissions headers. PDF.js is pinned; production CSP excludes `unsafe-eval` and remote scripts/workers. This version of PDF.js no longer exposes the older `isEvalSupported` option; CSP is enforced instead.

## Threats and controls

| Threat | Control / residual limit |
| --- | --- |
| Missing/duplicated/dropped pages | Two parsers must agree about page inventory. An exact ordered partition of 1…N is mandatory. The export is rebuilt from source bytes and reviewed rules, never a client-supplied filename list. Every PDF and each PDF inside the reopened ZIP is checked against manifest counts and hashes. Media/crop boxes and rotation are compared. This does not prove visual or semantic equivalence for every PDF. |
| Incorrect identification | Missing, repeated, conflicting and clipped values block the affected output. No locale/date or metadata inference. Manual corrections retain extraction evidence. Every proposed filename and page range is reviewable; explicit operator approval is required. Source/rule/preset/correction edits invalidate it. Operators can still approve incorrect text or use an unsuitable marker. |
| Wrong report boundaries | Marker is an exact, case-sensitive whole line in an explicit region. Page 1 must match; absent/ambiguous markers and orphan pages block export. Body substrings/out-of-region mentions do not match. Repeated exact markers inside the region can still match; the operator must choose a first-page-only marker. There is no value-change heuristic. |
| Traversal/overwriting | Final names are flat basenames, NFC normalized; path separators, filesystem-unsafe punctuation, control/format/bidi characters are replaced. Leading/trailing dots/spaces and Windows device names (including compatibility forms) are handled. UTF-8 names are capped at 180 bytes without splitting code points. NFKC/case-folded duplicate names block the entire download. No silent suffixing. The browser controls saving/extracting the ZIP; the application never writes into an existing report folder. Filesystem alias rules can differ; choose an empty extraction directory. |
| Malicious preset/prototype input | 64 KiB limit, exact version, property allowlist, finite normalized region bounds, 1–8 fields, unique allowlisted keys, reserved property names prohibited. No executable regex/eval/code, HTML injection, external URL or document data in the preset schema. React renders values as text. |
| Unsupported active PDF features | Encrypted inputs, forms, signatures, annotations, attachments, portfolios, layers and document actions are rejected. This intentionally conservative detection handles standard dictionaries and known supported parser paths; it is not a comprehensive malware scanner. A flat searchable source is required. Signatures do not remain valid after splitting. |
| Resource exhaustion | 30 MiB/500-page source limits; text/page/dimension caps; bounded preview raster; one page rendered at a time; 200 MiB output cap. Batch work runs in a terminable dedicated worker. Malicious compressed objects can still consume memory before caps are observed. Close the tab if a browser becomes unresponsive. Do not use this utility to inspect hostile PDFs. |
| Stale or partial export | UI has a synchronous operation latch as well as disabled controls. Requests use IDs; cancellation increments the generation and terminates the worker. Reviewed analysis hashes source bytes, rules and manual corrections. Export recomputes it, fails on mismatch/blockers, verifies everything before one Blob download, and checks generation again before offering it. No incomplete export is labeled complete. Browser save failure is outside application control; wording explicitly says the verified archive was handed to the browser. |
| Document persistence/leakage | PDF/text remain in JS/worker memory; no automatic document localStorage, IndexedDB, cache or session storage. Only explicit layout saves persist. Clear/close releases references and terminates work. Browser memory/swap/extensions/downloads remain outside this guarantee. The manifest contains identifying field values and must be protected. |
| Supply chain | Exact versions, committed lockfile, no runtime CDN resources. Local audit/license inventory documented. npm downloads dependencies during installation only. Rebuild/audit before release; a clean audit is not proof of absence of vulnerabilities. |

## Explicit exclusions

No OCR, password removal, signature validation, redaction, forensic preservation, cloud storage, emailing, legal/accounting conclusions or guaranteed extraction accuracy. No background scanning of user folders. Only a user-selected file or the supplied synthetic sample is processed. Clearing a document does not delete user files or securely erase memory. Saved presets are scoped to one browser origin and must be exported before migrating origins.

## Recovery

1. Keep the original PDF and use an empty destination when extracting downloaded archives.
2. Resolve blockers from the source preview; do not invent missing dates/authors. Recheck after every change.
3. Cancel a slow job, reduce batch size, then rerun preflight. Cancellation never emits a partial ZIP.
4. On parser/worker errors, reload a fresh, flat searchable source. Errors do not trigger network fallback or OCR.
5. After export, open the ZIP, compare filenames and source-page lineage, and inspect report content. Downloaded manifests are sensitive work products.

## PDF object-graph limitation

Article threads, presentation steps and PieceInfo application metadata are rejected. Export also inspects every serialized object and nested dictionary/array/stream dictionary, with cycle protection, and rejects Page dictionaries outside the output page tree. This catches hidden cross-page references that visible page counts alone miss. It does not prove complete content isolation: copied shared resources, unused XObjects or private metadata can contain non-visible content without an extra Page dictionary. ReportBatch is not a redaction/sanitization service; do not treat splitting as a confidentiality boundary for untrusted PDFs.
