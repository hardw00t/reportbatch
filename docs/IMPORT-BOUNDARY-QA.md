# Live synthetic import, boundary, and export QA

2026-10-18. Completed observations18:41–18:46UTC; initial grouped import initiated18:11 and awaited an external tool approval. Target https://reportbatch-private-preview.w00t1337.chatgpt.site/; directly observed asset index-Vpo0mRBu.js. Dot cloud Chrome on Linux; final DOM viewport1188×761. Only synthetic fixtures, with renewed explicit user authorization. No customer data.

## Passes
- Grouped synthetic PDF loaded6searchable pages through supported filechooser.setFiles. Original call lacked terminal result, but fresh page observation positively showed grouped-reports.pdf loaded; it was never retried. Marker preflight gave exactly[1,2],[3],[4,5,6]. Actual downloaded grouped.zip independently reopened:3PDFs with2,1,3pages, exact source groups, all SHA256 hashes match.
- Preset export/import round-trip: exported grouped preset, changed name to Temporary QA name, imported saved preset; name restored Report headers and grouping restored. Changed/imported rules invalidate prior review approval and require preflight. Extra-field preset rejected explicitly without replacing valid rules;65537-byte preset rejected as exceeding64KiB.
- 501-page PDF rejected with1–500page limit;30MiB+1byte PDF rejected with size-limit message.
- 500-page PDF accepted. Observed load-to-ready1376ms. Preflight500outputs/500pages. Traversed all10review pages and captured all500ready rows; selecting Review500 synchronized preview to page500 and correct Synthetic Person500 fields. Export download4912ms. Import→download24929ms including manual review/tool gaps. One synthetic small-per-page workload, not broad performance qualification. Browser RSS unavailable/unmeasured.
- 500.zip independently checked ALL500PDFs using pdfinfo: one page each, correct unique numbered filenames, exact ordered source partition1–500, every manifest SHA256 matches downloaded bytes.
- Exact30MiB/31457280-byte synthetic PDF accepted; load+preflight2185ms, one ready output, downloaded30MiB.zip independently reopened and hash/page count matched.
- Encrypted fixture rejected with password-protection unsupported message.
- Corrupt, scan/no-text, form, attachment, action, annotation, signature, layer fixtures all rejected with explicit safe errors. Unsupported replacements returned empty workbench; no stale prior outputs available.
- issues.pdf: ambiguous Author with2matching lines and missing Report type caused2blocked outputs. Explicit synthetic corrections to Another Person and Survey resolved blocks; no values guessed by app.
- Mixed-size4page fixture imported/preflighted with expected4names. Unicode fixture preflight/export preserved filename03_04_2026_Zoë García — Αλεξάνδρα_Résumé.pdf; independently reopened one-page PDF and verified checksum/sourcepage1.

## Incomplete / limitations
- rotated-cropped.pdf imported, but unchanged default header regions found no required fields and correctly blocked export. Layout adjustment, export geometry/render fidelity not completed for this fixture; not classified an app bug.
- Mixed-size fixture export/geometry comparison not performed in this run.
- Actual network, storage and response-header audit blocked: native Ctrl+Shift+I displayed “DevTools not allowed on this page. Your organization has blocked the use of DevTools on this page.” Did not bypass restriction or use alternate hidden-state access. No actual request capture or proof of zero PDF transmission.
- DOM-observed CSP meta: default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'. This is policy markup evidence only, not HTTP-header enforcement or network proof.
- Browser RSS target<1.5GB unmeasured. No cross-browser/device test, screen-reader/fullWCAG certification, sustained load or adverse-resource stress. Earlier keyboard/responsive report remains separate.
- Source/sample interleaving races not newly tested here; earlier cancellation/recovery smoke is separate.

## Tool/approval history
Grouped setFiles had a tool approval forwarded by parent and no returned final result before functions cell was terminated and supported JS kernel reset. Parent later supplied approval ID; outcome was not inferred from termination. Fresh DOM established that actual import completed. All subsequent preset/PDF imports returned normally. No import bypass was used.

## Evidence directory
docs/evidence/import-boundaries/
- grouped.zip, grouped-extracted/, grouped-export.jpg, grouped-preset.json
- 500.zip,500-extracted/,500-export.jpg,500-review-tables.txt
- 30MiB.zip,30MiB-extracted/
- unicode.zip,unicode-extracted/,unicode-export.jpg
- unsupported-results.json,geometry-results.json,issues-corrected.jpg
- devtools-policy-block.png
Fixtures: /workspace/shared/reportbatch/public/samples/, tests/fixtures/; /workspace/shared/reportbatch-qa-inputs/.
No new application failure established in this run. Remaining gates above prevent an unconditional production-ready claim.

Durable evidence includes manifests, archive SHA-256/size inventory and independent verification results. Large raw ZIPs remain in the QA workspace; they are not committed to source.

Some raw screenshots are retained only in the QA workspace and are not part of this source checkpoint. The textual observation records the browser policy blocker.
