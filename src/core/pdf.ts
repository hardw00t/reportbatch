import { PDFDocument, PDFArray, PDFDict, PDFName, PDFObject, PDFRef, PDFStream } from 'pdf-lib';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { MAX_EXPORT_BYTES, MAX_FILE_BYTES, MAX_PAGES, sha256 } from './preset';
import { analyzeBatch, assertPartition } from './plan';
import { buildLines } from './text';
import type { Analysis, LoadedDocument, Manifest, Overrides, PageText, Preset, Progress, Token } from './types';

export type OpenPdf = (bytes: Uint8Array) => Promise<PDFDocumentProxy>;
export type ReportProgress = (progress: Progress) => void;
export const abortError = () => new DOMException('Operation cancelled. Nothing was exported.', 'AbortError');
const checkAbort = (signal?: AbortSignal) => { if (signal?.aborted) throw abortError(); };
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function multiply(a: number[], b: number[]): number[] {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}
export async function extractPage(page: PDFPageProxy): Promise<PageText> {
  const viewport = page.getViewport({ scale: 1 });
  if (viewport.width < 30 || viewport.height < 30 || viewport.width > 10000 || viewport.height > 10000) throw new Error(`Page ${page.pageNumber} has unsupported dimensions.`);
  const content = await page.getTextContent();
  if (content.items.length > 6000) throw new Error(`Page ${page.pageNumber} exceeds the 6,000 text-item safety limit.`);
  const tokens: Token[] = [];
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    if (item.dir === 'ttb' || content.styles[item.fontName]?.vertical) throw new Error(`Page ${page.pageNumber} uses unsupported vertical text. Use a horizontal-text report layout.`);
    const t = multiply(viewport.transform, item.transform);
    const fontSize = Math.hypot(t[0], t[1]);
    if (!fontSize || !Number.isFinite(fontSize)) continue;
    const dx = t[0]/fontSize, dy = t[1]/fontSize;
    const upLength = Math.hypot(t[2], t[3]);
    const ux = upLength ? t[2]/upLength : dy, uy = upLength ? t[3]/upLength : -dx;
    const style = content.styles[item.fontName];
    const ascent = Number.isFinite(style?.ascent) ? style.ascent : 0.8;
    const descent = Number.isFinite(style?.descent) ? style.descent : -0.2;
    const height = upLength || fontSize;
    // PDF.js widths use PDF coordinates; viewport coordinates include UserUnit.
    const advance = Math.abs(item.width) * Math.hypot(viewport.transform[0], viewport.transform[1]);
    const corners = [
      [t[4]+ux*height*ascent, t[5]+uy*height*ascent],
      [t[4]+ux*height*descent, t[5]+uy*height*descent],
      [t[4]+dx*advance+ux*height*ascent, t[5]+dy*advance+uy*height*ascent],
      [t[4]+dx*advance+ux*height*descent, t[5]+dy*advance+uy*height*descent],
    ];
    const x = Math.min(...corners.map(c => c[0]))/viewport.width, y = Math.min(...corners.map(c => c[1]))/viewport.height;
    const box = { x, y, width: Math.max(...corners.map(c => c[0]))/viewport.width-x, height: Math.max(...corners.map(c => c[1]))/viewport.height-y };
    const cx = box.x+box.width/2, cy = box.y+box.height/2;
    if (cx < 0 || cx > 1 || cy < 0 || cy > 1) continue;
    if ([x, y, box.width, box.height, advance].some(n => !Number.isFinite(n))) throw new Error(`Page ${page.pageNumber} contains unsupported text geometry.`);
    tokens.push({ text: item.str, box, bx: t[4], by: t[5], dx, dy, advance, fontSize });
  }
  return { number: page.pageNumber, width: viewport.width, height: viewport.height, rotation: page.rotate, tokens, lines: buildLines(tokens) };
}

export async function validatePdf(bytes: Uint8Array): Promise<PDFDocument> {
  if (!bytes.length) throw new Error('This file is empty. Choose a searchable PDF.');
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('This file exceeds the 30 MiB limit. Split it into smaller source batches first.');
  if (!new TextDecoder().decode(bytes.subarray(0, 8)).startsWith('%PDF-')) throw new Error('This file does not have a valid PDF header. The original is unchanged.');
  if (!new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 2048))).includes('%%EOF')) throw new Error('This PDF is incomplete or malformed (missing end marker). Export a fresh searchable PDF from its source.');
  let pdf: PDFDocument;
  try { pdf = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true }); }
  catch (error) {
    if (/encrypt|password/i.test((error as Error).message)) throw new Error('Encrypted or password-protected PDFs are unsupported. Use an authorized unencrypted copy.');
    throw new Error('This PDF could not be parsed safely. It may be malformed or unsupported. Export a fresh copy from its source.');
  }
  if (pdf.isEncrypted) throw new Error('Encrypted PDFs are unsupported.');
  let pageCount: number;
  try { pageCount = pdf.getPageCount(); }
  catch { throw new Error('This PDF could not be parsed safely. Its page tree is malformed. Export a fresh copy from its source.'); }
  if (pageCount < 1 || pageCount > MAX_PAGES) throw new Error(`Use a PDF with 1–${MAX_PAGES} pages. Split larger files into smaller source batches first.`);
  if (pdf.catalog.has(PDFName.of('AF'))) throw new Error('PDF attachments are unsupported. Use a clean, flat searchable PDF.');
  for (const key of ['AcroForm', 'Perms', 'Collection', 'OpenAction', 'AA', 'OCProperties', 'Threads', 'PieceInfo']) {
    if (pdf.catalog.has(PDFName.of(key))) throw new Error('Forms, signatures, portfolios, layers and document actions are unsupported. Export a flat, searchable PDF first; signatures will not carry over.');
  }
  const names = pdf.catalog.lookup(PDFName.of('Names'));
  if (names instanceof PDFDict && (names.has(PDFName.of('EmbeddedFiles')) || names.has(PDFName.of('JavaScript')))) throw new Error('PDF attachments and JavaScript are unsupported. Use a clean, flat searchable PDF.');
  for (const [index, page] of pdf.getPages().entries()) {
    const annotations = page.node.lookup(PDFName.of('Annots'));
    if ((annotations && (!(annotations instanceof PDFArray) || annotations.size() > 0)) || ['AA', 'AF', 'PresSteps', 'B', 'PieceInfo'].some(key => page.node.has(PDFName.of(key)))) throw new Error(`Page ${index+1} has annotations, form fields, actions, article threads, private application data or attachments. Export a flat searchable copy first.`);
  }
  return pdf;
}

// Count every serialized Page object, including direct dictionaries in arrays or
// stream metadata. A correct visible page tree alone cannot detect copied beads
// or private references to other reports. This is not content sanitization.
export function assertNoHiddenPages(pdf: PDFDocument): void {
  const expected = new Set<PDFDict>(pdf.getPages().map(page => page.node));
  const seen = new Set<PDFObject>();
  const pending: PDFObject[] = pdf.context.enumerateIndirectObjects().map(([, object]) => object);
  while (pending.length) {
    const object = pending.pop()!;
    if (seen.has(object)) continue;
    seen.add(object);
    if (object instanceof PDFRef) {
      const resolved = pdf.context.lookup(object); if (resolved) pending.push(resolved);
    } else if (object instanceof PDFStream) pending.push(object.dict);
    else if (object instanceof PDFDict) {
      if (object.lookup(PDFName.of('Type')) === PDFName.of('Page') && !expected.has(object)) throw new Error('Generated PDF contains hidden page references outside the reviewed output. Nothing was exported.');
      pending.push(...object.values());
    } else if (object instanceof PDFArray) {
      for (let i = 0; i < object.size(); i++) pending.push(object.get(i));
    }
  }
}

export async function loadDocument(bytes: Uint8Array, name: string, open: OpenPdf, progress: ReportProgress = () => {}, signal?: AbortSignal): Promise<LoadedDocument> {
  checkAbort(signal);
  const checked = await validatePdf(bytes);
  checkAbort(signal);
  let pdf: PDFDocumentProxy | undefined;
  try {
    pdf = await open(Uint8Array.from(bytes));
    if (pdf.numPages !== checked.getPageCount() || pdf.isPureXfa) throw new Error('The PDF parsers disagree about the page inventory, or this document uses an unsupported XFA layout.');
    if (await pdf.hasJSActions()) throw new Error('PDF JavaScript actions are unsupported.');
    const pages: PageText[] = [];
    let totalChars = 0;
    for (let i=1; i<=pdf.numPages; i++) {
      checkAbort(signal);
      progress({ phase: 'Reading searchable text', done: i-1, total: pdf.numPages });
      const page = await pdf.getPage(i);
      const text = await extractPage(page);
      totalChars += text.tokens.reduce((sum, token) => sum+token.text.length, 0);
      if (totalChars > 2_000_000) throw new Error('This batch exceeds the 2 million extracted-character safety limit. Use a smaller source batch.');
      if (!text.lines.some(line => /[\p{L}\p{N}]/u.test(line.text))) throw new Error(`Page ${i} has no usable searchable text. Scans and blank pages are unsupported. Run OCR outside ReportBatch or use a searchable source; no pages were exported.`);
      pages.push(text);
      page.cleanup();
      await tick();
    }
    checkAbort(signal);
    const digest = await sha256(bytes);
    progress({ phase: 'Source checked', done: pages.length, total: pages.length });
    return { info: { name, byteLength: bytes.byteLength, pageCount: pages.length, sha256: digest }, pages, bytes };
  } catch (error) {
    if ((error as Error).name === 'PasswordException') throw new Error('Encrypted or password-protected PDFs are unsupported.');
    throw error;
  } finally { await pdf?.loadingTask.destroy(); }
}

export async function exportBundle(source: LoadedDocument, preset: Preset, overrides: Overrides, expectedAnalysisId: string, progress: ReportProgress = () => {}, signal?: AbortSignal): Promise<{ bytes: Uint8Array; manifest: Manifest; analysis: Analysis }> {
  checkAbort(signal);
  const analysis = await analyzeBatch(source.info, source.pages, preset, overrides);
  if (analysis.id !== expectedAnalysisId) throw new Error('The source or rules changed after review. Run preflight again.');
  if (analysis.blockingCount || !analysis.outputs.length) throw new Error('Resolve every blocked output and page-coverage issue before exporting.');
  assertPartition(analysis.outputs.map(output => output.pages), source.info.pageCount);
  const pdf = await validatePdf(source.bytes);
  const files: Record<string, Uint8Array> = Object.create(null);
  const outputs: Manifest['outputs'] = [];
  let totalBytes = 0;
  for (const output of analysis.outputs) {
    checkAbort(signal);
    progress({ phase: 'Creating and reopening PDFs', done: output.index-1, total: analysis.outputs.length });
    const document = await PDFDocument.create();
    const pages = await document.copyPages(pdf, output.pages.map(page => page-1));
    for (const page of pages) document.addPage(page);
    document.setCreator('ReportBatch'); document.setProducer('ReportBatch / pdf-lib');
    document.setCreationDate(new Date('2000-01-01T00:00:00Z')); document.setModificationDate(new Date('2000-01-01T00:00:00Z'));
    const bytes = await document.save({ useObjectStreams: true });
    const reopened = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
    assertNoHiddenPages(reopened);
    if (reopened.getPageCount() !== output.pages.length) throw new Error('Generated PDF page count failed verification. Nothing was exported.');
    for (const [i, page] of reopened.getPages().entries()) {
      const original = pdf.getPage(output.pages[i]-1);
      if (JSON.stringify([page.getMediaBox(), page.getCropBox(), page.getRotation()]) !== JSON.stringify([original.getMediaBox(), original.getCropBox(), original.getRotation()])) throw new Error('Generated page geometry failed verification. Nothing was exported.');
    }
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_EXPORT_BYTES) throw new Error('The generated PDFs exceed the 200 MiB export safety limit. Use a smaller batch. Nothing was downloaded.');
    files[output.filename] = bytes;
    outputs.push({ filename: output.filename, sourcePages: output.pages, pageCount: output.pages.length, sha256: await sha256(bytes), fields: output.fields, notices: output.notices });
    await tick();
  }
  checkAbort(signal);
  const manifest: Manifest = {
    schemaVersion: 1, application: 'ReportBatch', applicationVersion: '0.1.0', analysisId: analysis.id,
    source: source.info, preset: analysis.preset, outputs,
    verification: { pagePartition: true, pdfsReopened: true, zipReopened: true, totalOutputPages: outputs.reduce((sum, output) => sum+output.pageCount, 0) },
    limitations: ['Field values are literal extracted text or explicit manual corrections; dates and identities are not inferred.', 'Page counts and geometry were verified. The operator must review content and grouping. No semantic accuracy guarantee.', 'Bookmarks, document metadata and document-level structure are not preserved. Forms, signatures, annotations, attachments, layers and actions are unsupported.'],
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2)+'\n');
  progress({ phase: 'Packing and checking the archive', done: 0, total: outputs.length });
  const bytes = zipSync(files, { level: 0, mtime: new Date('1980-01-01T00:00:00Z') });
  checkAbort(signal);
  const unpacked = unzipSync(bytes);
  const expectedNames = [...outputs.map(output => output.filename), 'manifest.json'].sort();
  if (JSON.stringify(Object.keys(unpacked).sort()) !== JSON.stringify(expectedNames) || strFromU8(unpacked['manifest.json']) !== strFromU8(files['manifest.json'])) throw new Error('The archive inventory failed verification. Nothing was exported.');
  for (const [index, output] of outputs.entries()) {
    checkAbort(signal);
    const data = unpacked[output.filename];
    const reopened = await PDFDocument.load(data, { updateMetadata: false, throwOnInvalidObject: true });
    assertNoHiddenPages(reopened);
    if (reopened.getPageCount() !== output.pageCount || await sha256(data) !== output.sha256) throw new Error('An archived PDF failed page-count or checksum verification. Nothing was exported.');
    progress({ phase: 'Verifying archived PDFs', done: index+1, total: outputs.length });
    await tick();
  }
  checkAbort(signal);
  return { bytes, manifest, analysis };
}
