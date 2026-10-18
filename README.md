# ReportBatch

A local-first workbench for splitting **searchable, fixed-layout PDFs** into named reports, with full-batch preflight and a page-lineage manifest. No document uploads, telemetry, account, OCR or paid API. The original file is never written.

**Private review build, v0.1.0.** Release evidence lives in [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md). A successful build is not a production-readiness claim. Keep this repository private until its owner reviews the evidence and authorizes publication.

## Run locally

Use Node.js 22.13+ and npm. The lockfile pins dependencies. Tested environment and exact results are recorded in the release checklist.

```sh
npm ci
npm run build
npm run serve
```

Open **http://127.0.0.1:4173**. The included server binds only to loopback and serves static GET/HEAD requests. It has no document-processing or upload endpoint. Stop it with Ctrl-C. Set `REPORTBATCH_PORT` to use a different local port. Installation downloads free open-source dependencies; document processing uses no external service.

For development, `npm run dev` serves http://127.0.0.1:5173. Production validation uses the built application, not the dev server.

## First good export

1. Select **Try the sample**. It loads four fictional, one-page reports and a matching layout.
2. Run **full-batch preflight**. Inspect each proposed filename and source page range. Select **Review 001**, etc. to compare the fields with the page preview. Dates remain literal; the sample's `12/10/2026` becomes `12_10_2026` solely because `/` is unsafe in a filename.
3. Resolve missing/ambiguous fields with verified corrections and recheck. Duplicate names block export; suffixes are never silently added. You may deliberately include `{index}` in a filename template after verifying identity.
4. Confirm the review and select **Export verified ZIP**. The archive contains named PDFs and `manifest.json`. The workbench reopens every generated PDF and then the ZIP's PDFs to check actual counts and hashes before handing the archive to the browser. Confirm the save in your browser's Downloads list.

For multipage reports, load [grouped-reports.pdf](public/samples/grouped-reports.pdf), choose **Split → Exact start-marker line**, use `REPORT START`, then preflight. Expected groups are pages **1–2**, **3**, and **4–6**. Mentions in the body outside the marker region do not create boundaries.

## Layouts and extraction

- Each required field is read from the **first page of each proposed report**. The default fields are date, author and report type. Import a version-1 preset to define up to eight required fields.
- Use a case-sensitive line prefix within a bounded region, or a region containing one complete line. Multiple matches, conflicting values and clipped tokens require review. Text line reconstruction is geometric; difficult layouts may be unsupported or require explicit correction.
- Draw a region or edit its left/top/width/height percentages with the keyboard. Coordinates refer to the visible, cropped, rotated page; every page's viewport is applied independently.
- **One page per report** and **exact whole-line start marker** are separate explicit modes. Marker mode does not infer a boundary from a value changing. The first source page must match a marker. No markers, orphan pages or multiple markers on one page block the batch.
- A marker repeated on every page can still create a boundary on every page. Use a marker exclusive to report starts and inspect every range. The application cannot infer the intended meaning of a repeated header.
- Values are text, not dates or identities to be guessed. No locale conversion, metadata substitution or AI inference occurs. All fields are required even if the filename template does not use them.
- Rule, source, preset and manual-value edits invalidate approval. Corrections must be rechecked. Cancellation terminates the worker and produces no partial archive; preflight reloads the in-memory source on retry.

**Save on this device** persists only explicitly saved layout rules in `localStorage`. **Export preset** writes a versioned JSON file with an allowlisted schema. It excludes PDF bytes, page text and manual corrections. Imports reject unsupported properties and oversized input. **Clear saved layouts** removes local layout storage.

## Limits and unsupported documents

| Limit | Bound |
| --- | --- |
| Source PDF | 1–500 pages, at most 30 MiB |
| Extracted text | At most 2,000,000 characters total and 6,000 items per page |
| Visible page dimensions | 30–10,000 pt per axis |
| Generated PDFs | At most 200 MiB combined, before manifest/ZIP overhead |
| Final filename | At most 180 UTF-8 bytes including `.pdf` |
| Preset import | Version 1, at most 64 KiB and 8 fields |
| Saved presets | At most 20 on one origin/browser |

These are safety limits, not guarantees that every document inside them will work. Performance results apply only to the tested fixtures and hardware. Thousands of reports are **not supported in one batch** in this release. Use smaller source batches; do not silently omit excess pages.

Rejects encrypted/password-protected files; pages with no usable searchable text (including blank pages); malformed/unsupported layouts; vertical writing; forms, signatures, annotations, attachments, portfolios, layers and document actions. An empty annotation array is accepted. Use an authorized, flattened, searchable PDF from its source; flattening a signature does not preserve signature validity. There is no OCR, signature verification, password removal or sanitization service.

Page content, page order, crop/media boxes and rotation are copied. Bookmarks, document metadata, structure tagging, cross-document links and interactive features are not carried over. Searchable text may still be incorrect in an OCR text layer. Reopened counts/checksums do not prove semantic correctness or pixel equality for arbitrary inputs. Review the output before using it.

## Privacy and recovery

PDF bytes and extracted text remain in workbench memory. There is no IndexedDB, service worker, document cache, session storage or automatic document persistence. Closing the tab or clearing the document releases application references; this is not a secure-erasure guarantee about the browser, OS, extensions, swap or downloaded files. The local static server sends only app assets and synthetic samples. Browser font/codec assets come from the same local build.

The downloaded manifest intentionally includes the source filename and hash, final fields, extraction candidates, corrections, rules, output hashes and page lineage. Protect it like the report PDFs. Rules may themselves contain sensitive text you explicitly type; inspect presets before sharing them.

If a file fails, the original remains unchanged. Read the error and obtain a fresh supported PDF rather than bypassing checks. If the worker stops or an operation is cancelled, rerun preflight; change/reload the original if necessary. If a browser download is blocked or the disk is full, the application cannot confirm the browser saved it: check Downloads and retry from the reviewed batch. See [the threat model](docs/THREAT-MODEL.md) for the boundaries of these protections.

## Reproduce validation

```sh
npm test                 # Pure rules + real PDF integration, cancellation and source-boundary tests
npm run build            # Typecheck and production assets
npm run test:e2e         # Real Chrome, actual downloads, keyboard/accessibility/network checks
npm run test:perf        # Separate 500-page and source-size browser resource checks
npm run licenses         # Lockfile/package metadata and distribution notices
npm audit --omit=dev
```

Browser tests use an installed Chrome in a temporary profile; no existing browser settings or credentials are used. Alternatively install Playwright's Chromium (`npx playwright install chromium`) and set `PW_CHANNEL=chromium`. No browser installation is required where Chrome already exists. The end-to-end suite owns a loopback server and shuts it down afterwards. It tests a prebuilt `dist/`; rebuild after source changes. `test-results/` and `playwright-report/` retain failures locally and are ignored by Git. Checked-in evidence contains synthetic data only.

Synthetic fixtures are checked in. `npm run fixtures` regenerates the primary PDFs. The embedded Unicode test font is Noto Sans under the SIL Open Font License; source and license are in `tests/fixtures/fonts/`. Optionally regenerate the actual encrypted rejection fixture with `python3 scripts/encrypted-fixture.py` and `pypdf==6.15.0`. Python is not an application dependency. The synthetic password in that script protects fake fixture content only.

## Static deployment

`npm run build` creates a self-contained `dist/` directory. Serve all of it, including `vendor/pdfjs` assets and notices, over HTTPS or localhost; opening `index.html` with `file://` is unsupported. `base: './'` supports a directory mount with a trailing slash. Apply the security headers in [scripts/serve.mjs](scripts/serve.mjs), disable access/body logging for documents (no upload route is needed), and do not add analytics. A remote static host would receive ordinary asset requests/IP metadata, so the default supported deployment is local loopback.

No hosting, checkout, payment, accounts, remote CI or outreach is activated. [Commercial hypothesis](docs/COMMERCIAL-HYPOTHESIS.md) distinguishes observed workflow commissions from unvalidated demand for this product.

## Structure and license

`src/core/` contains pure preset/text/planning logic and PDF verification. `engine.worker.ts` owns expensive batch work; `EngineClient` terminates it on cancellation. `PdfPreview.tsx` renders one page at a time. React state binds approval to the active preflight. No application backend is required.

Original code: [MIT](LICENSE). Pinned dependency/license metadata is in [docs/DEPENDENCIES.json](docs/DEPENDENCIES.json); the build ships upstream license text in `THIRD_PARTY_NOTICES.txt` and asset license files. License review is recorded in the release checklist.

### Important confidentiality limitation

Splitting is not redaction or sanitization. The workbench rejects known article-thread, presentation-step and private application metadata structures, and checks for hidden Page objects outside each output's page tree. Shared resources, unused XObjects or private metadata can still contain non-visible content without extra Page objects. Do not rely on split PDFs as a confidentiality boundary for untrusted source documents. See [VM validation](docs/VM-VALIDATION.md) for current fixes, evidence and browser-test blockers.
