# Bounded v0.1 release runbook

## Product contract

Searchable, fixed-layout, flat PDF batches only. One page per report or explicit whole-line start markers; 1–8 required first-page fields; literal text filenames; manual review and blocking corrections; ZIP plus page-lineage manifest. No OCR, inference, upload endpoint, accounts, payments or automatic document retention. Every enabled control must perform its described action or explain why it is disabled.

Hard input bounds: 1–500 pages, 30 MiB, 2 million extracted characters, 6,000 text items per page, visible dimensions 30–10,000 pt per axis. Output PDFs total at most 200 MiB; filenames at most 180 UTF-8 bytes; preset JSON at most 64 KiB/schema 1; at most 20 explicitly saved layouts. These are rejection boundaries, not universal performance guarantees.

Splitting is not redaction, malware scanning or a confidentiality boundary. A copied page can retain non-visible resources. Review before sharing outputs; protect the manifest because it contains names, field values, corrections and source lineage.

## Acceptance before calling this production-ready

- Exact source commit and tree recorded; private main matches; reproducible lockfile install, all Node tests and production build pass; dependency/license review recorded.
- Supported browser completes sample, imported PDF and preset round-trip, grouped ranges, corrections, duplicate/missing fields, approval invalidation, cancellation/retry, reset and actual downloaded ZIP verification. No silent field substitution or incomplete archive.
- Unsupported/malformed/encrypted/oversized input visibly blocks; subsequent valid input recovers. Boundary fixtures exercise 500/501 pages and 30 MiB/+1 byte.
- Request/storage observation covers PDF workers, preview, rules, correction, export and reset with synthetic canaries. Host headers are verified on the actual deployed response, separately from local-server tests.
- Large-fixture browser timing and memory measured on the supported target; no unexplained crash/hang, partial output or unresponsive cancellation. Existing acceptance target: 500 reports within 90 seconds and sampled browser-process RSS below 1.5 GB. Report method and hardware; unsupported metrics remain an open gate.
- Keyboard flow, focus visibility, errors, screen-reader names/status, automated accessibility scan and 320/375 px/400% zoom reflow verified. Touch and other browsers are not advertised unless actually tested.
- Every output from release fixtures reopens; counts, ordered page partition and SHA-256 match manifest. Representative rotated/cropped/Unicode pages visually compared with source. Counts alone do not establish visual or semantic fidelity.
- Checklist contains no unresolved release blocker; limitations are visible; owner accepts the exact release artifact and deployment audience. A successful preview is not release acceptance.

## Package and deploy

1. Freeze the exact source SHA/tree. Run `npm ci`, `npm test`, `npm run build` and applicable browser suites against that source. Do not infer fresh test results from an older commit.
2. Retain complete `dist/`, including `vendor/pdfjs`, synthetic samples and third-party notices. Record hashes of every artifact and source provenance. No customer PDFs, local browser data, environment secrets or development dependencies belong in the distribution.
3. Default local distribution: Node 22.13+, `npm run serve`, loopback http://127.0.0.1:4173. `file://` is unsupported. For an authorized static host use HTTPS and all security headers from `scripts/serve.mjs`; do not add analytics or document endpoints.
4. Use only the already-authorized publisher/host. Keep source repository private. A host/audience change, paid service or new credentials needs separate authorization.
5. Verify the live asset fingerprint and response headers, then smoke-test synthetic sample, correction, export and preset import on the exact deployment. Reopen download and verify hashes/lineage. Save evidence and timestamp.

## Rollback and incident response

- Keep the previous known-good immutable build and source/deployment IDs. Never overwrite the only working artifact or change source history to hide a failure.
- On wrong grouping, content leakage, unexpected network traffic or corrupted export, stop treating the deployment as approved. Warn the owner, preserve only synthetic reproduction evidence, and revert through the same authorized deployment mechanism to the recorded known-good version or remove access with owner authorization.
- Verify the rollback's actual live fingerprint and repeat sample export. A control-plane success message alone does not prove rollback reached browsers; account for cached/open tabs.
- Saved schema-1 presets remain user-controlled. Do not silently clear them during rollback. Ask users to export rules before a future incompatible schema migration.
- Downloads cannot be recalled. Tell affected users to stop using suspect outputs and regenerate from unchanged originals after the fix. Do not request customer documents by default; use a minimized synthetic reproduction.

## Support boundaries

Record browser/version, OS, viewport, app asset fingerprint, phase, visible error and synthetic reproduction steps. Never ask for passwords or upload confidential PDFs to diagnostics. Explain rejection rather than suggesting disabling checks. Browser save failures require checking Downloads/storage; the app verifies archive bytes, not filesystem persistence. Closing/resetting releases application references but does not securely erase OS/browser memory or downloads.

Current validated browser/platform and remaining gaps are recorded in RELEASE-CHECKLIST.md. There is no cross-browser, mobile, assistive-technology or hostile-PDF guarantee beyond recorded evidence.
