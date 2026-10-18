# ReportBatch live cloud-browser QA

Date: 2026-10-18. Latest verification: 15:18 UTC.
Target: https://reportbatch-private-preview.w00t1337.chatgpt.site/
Environment: dot's cloud Chrome via supported CUA API; no user laptop, real private documents, source changes, or authentication bypass.
Verified deployed script after reload: /assets/index-DJAwKvp4.js.
Parent-reported publication: Sites commit 549b04e483c8b9cdd972b388980ee71c77010e76 at 13:26 UTC. Git source identity was not independently derived from the browser; asset identity is direct evidence.

## Passed on current deployment
- Fictional built-in sample loaded: 4 searchable pages.
- Full preflight proposed 4 outputs covering source pages 1–4.
- Regression: select report003, blank Author, recheck. Inspector remained REPORT003/PAGES3 and preview remained source page3. Required-value warning visible and export disabled.
- Restore author to Zoë Martin and recheck: report003/page3 stayed aligned; filename restored; review confirmation required before export.
- Confirm review and export: actual ZIP downloaded. Independently reopened archive and all four PDFs using Poppler; each one page, all SHA-256 values matched manifest, source page partition exactly [1,2,3,4]. Manifest recorded report003 author correction.
- Clear document removed source/review UI and returned start state.
- Cancel during subsequent sample load returned start state and cancellation message; a new sample load then completed normally.
- Enter activated Try sample, full preflight, and Review003. Focus observed on Review003 after keyboard activation. This is limited keyboard smoke coverage, not a complete navigation/accessibility audit.
- Desktop document width equalled viewport width (1165 px), with no document-level horizontal overflow at that width.

## Earlier deployment checks
- Empty required author correctly blocked export.
- Duplicate filenames from manual corrections blocked both colliding outputs.
- Missing exact start marker proposed zero reports and blocked export with marker/coverage errors. Restoring REPORT START recovered four outputs.
- Exported layout preset downloaded successfully; round-trip import not verified.
- Earlier ZIP independently passed hashes/page counts/partition/text checks. Rendered page3 visually inspected, preserving Zoë Martin and literal12/10/2026.

## Bug found and resolved in live regression
Earlier deployed d7aaebc8 sample: Review003 → edit Author → Recheck corrections reset inspector to report001 while preview stayed page3. Reproduced twice and reported. Current deployed asset passed both blank-value and restored-value regression described above. No remaining failure established for that scenario.

## Blocked / unrun
- Preset import round-trip stalled at the supported file-chooser/setFiles workflow and was aborted. Not retried. No completed import claim.
- Subsequent browser inspection and listing also stalled; supported JS kernel reset recovered browser operation. These stalls do not establish an application defect.
- Mobile/responsive viewport emulation unrun: no advertised resize/emulation capability in supported tab API. Desktop-only width check above.
- Full a11y audit, screen reader, complete Tab order, contrast audit, touch, browser matrix, formal performance/load profiling, network capture/no-upload proof, external-PDF import, multi-page fixture grouping, source replacement races, and automated browser suite unrun.
- No production-readiness or comprehensive privacy/security assurance implied.

## Retained evidence
- evidence/live-browser/reportbatch-fixed-blank-author.jpg — fixed alignment and blocked missing field
- evidence/live-browser/reportbatch-fixed-export.jpg — successful live export
- evidence/live-browser/fixed-sample.zip — actual browser download, including manifest and four PDFs

Earlier mismatch/render evidence is retained in the QA workspace; current acceptance artifacts above are committed with this report.
