import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { strFromU8, unzipSync } from 'fflate';
import { abortError, exportBundle, loadDocument, validatePdf } from '../src/core/pdf';
import { analyzeBatch } from '../src/core/plan';
import { DEFAULT_PRESET, MAX_FILE_BYTES, MAX_PAGES, sha256 } from '../src/core/preset';
import type { Manifest } from '../src/core/types';
import { makeFixture, makeSizedFixture, SAMPLE_REPORTS } from '../scripts/fixture-lib';

const base=resolve('node_modules/pdfjs-dist');
const open = async (data: Uint8Array) => getDocument({data,enableXfa:false,stopAtErrors:true,useSystemFonts:true,useWorkerFetch:false,standardFontDataUrl:base+'/standard_fonts/',cMapUrl:base+'/cmaps/',cMapPacked:true,wasmUrl:base+'/wasm/',verbosity:0}).promise;
const fixture=(name:string)=>readFile(resolve(name));
const read=(name='public/samples/reportbatch-sample.pdf')=>fixture(name).then(bytes=>loadDocument(Uint8Array.from(bytes),name,open));

test('real sample export reopens every archived PDF, checks filenames, hashes and page lineage', async () => {
  const source=await read(),before=await sha256(source.bytes),p=structuredClone(DEFAULT_PRESET);
  const analysis=await analyzeBatch(source.info,source.pages,p);
  assert.equal(analysis.blockingCount,0);assert.equal(analysis.outputs.length,4);
  assert.equal(analysis.outputs[2].filename,'12_10_2026_Zoë Martin_Survey.pdf');
  const result=await exportBundle(source,p,{},analysis.id),archive=unzipSync(result.bytes);
  const manifest=JSON.parse(strFromU8(archive['manifest.json'])) as Manifest;
  assert.deepEqual(Object.keys(archive).sort(),[...manifest.outputs.map(o=>o.filename),'manifest.json'].sort());
  const seen:number[]=[];
  for(const output of manifest.outputs) {
    const bytes=archive[output.filename],pdf=await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(),output.pageCount);assert.equal(await sha256(bytes),output.sha256);
    const parsed=await loadDocument(bytes,output.filename,open);
    const text=parsed.pages.flatMap(page=>page.lines.map(line=>line.text)).join('\n');
    for(const page of output.sourcePages) {assert.ok(text.includes(`PAGE-LINEAGE-${String(page).padStart(3,'0')}`));seen.push(page);}
  }
  assert.deepEqual(seen,[1,2,3,4]);assert.equal(await sha256(source.bytes),before);
  assert.deepEqual((await exportBundle(source,p,{},analysis.id)).bytes,result.bytes,'same source/rules produce the same bundle bytes');
});
test('multi-page marker exports retain continuations in order exactly once', async () => {
  const source=await read('public/samples/grouped-reports.pdf'),p=structuredClone(DEFAULT_PRESET);p.grouping.mode='marker';
  const analysis=await analyzeBatch(source.info,source.pages,p);
  assert.equal(analysis.blockingCount,0);assert.deepEqual(analysis.outputs.map(o=>o.pages),[[1,2],[3],[4,5,6]]);
  const {bytes,manifest}=await exportBundle(source,p,{},analysis.id),archive=unzipSync(bytes);
  for(const output of manifest.outputs) {
    const reopened=await loadDocument(archive[output.filename],output.filename,open);
    assert.deepEqual(reopened.pages.map(p=>p.lines.find(l=>l.text.startsWith('PAGE-LINEAGE-'))?.text.match(/PAGE-LINEAGE-\d+/)?.[0]),output.sourcePages.map(n=>`PAGE-LINEAGE-${String(n).padStart(3,'0')}`));
  }
});
test('rotated/cropped geometry is normalized to visible page, and output geometry is retained', async () => {
  const source=await read('tests/fixtures/rotated-cropped.pdf'),page=source.pages[0];
  assert.equal(page.width,732);assert.equal(page.height,552);assert.equal(page.rotation,90);
  const date=page.tokens.find(token=>token.text.startsWith('Date:'))!;
  assert.ok(Math.abs(date.box.x-((635-30)-.207*12)/732)<.005,`unexpected rotated x ${date.box.x}`);
  assert.ok(Math.abs(date.box.y-22/552)<.005,`unexpected rotated y ${date.box.y}`);
  const p=structuredClone(DEFAULT_PRESET);
  p.fields[0].region={x:.81,y:.02,width:.04,height:.75};
  p.fields[1].region={x:.77,y:.02,width:.04,height:.75};
  p.fields[2].region={x:.71,y:.02,width:.04,height:.75};
  const analysis=await analyzeBatch(source.info,source.pages,p);assert.equal(analysis.blockingCount,0,JSON.stringify(analysis.outputs));
  const {manifest}=await exportBundle(source,p,{},analysis.id);assert.equal(manifest.outputs[0].pageCount,1);
});
test('mixed-size pages and an embedded Unicode font extract without date interpretation', async () => {
  const mixed=await read('tests/fixtures/mixed-sizes.pdf'),p=structuredClone(DEFAULT_PRESET);
  assert.notEqual(mixed.pages[0].width,mixed.pages[1].width);
  const plan=await analyzeBatch(mixed.info,mixed.pages,p);assert.equal(plan.blockingCount,0);await exportBundle(mixed,p,{},plan.id);
  const unicode=await read('tests/fixtures/unicode.pdf');
  const parsed=await analyzeBatch(unicode.info,unicode.pages,p);
  assert.equal(parsed.outputs[0].fields.author.value,'Zoë García — Αλεξάνδρα');
  assert.equal(parsed.outputs[0].fields.date.value,'03/04/2026');
  assert.equal(parsed.outputs[0].fields.type.value,'Résumé');
  assert.equal(parsed.blockingCount,0);
});
test('corrupt, encrypted, scanned and interactive/attached documents reject with recovery guidance', async () => {
  const cases=[['corrupt',/parsed|malformed/i],['encrypted',/encrypted|password/i],['scan',/no usable searchable text/i],['form',/forms/i],['attachment',/attachments/i],['annotation',/annotations/i],['signature',/signatures/i],['action',/actions/i],['layer',/layers/i]] as const;
  for(const [name,pattern] of cases)await assert.rejects(()=>read(`tests/fixtures/${name}.pdf`),pattern,name);
  await assert.rejects(()=>validatePdf(new Uint8Array()),/empty/);
  await assert.rejects(()=>validatePdf(new TextEncoder().encode('not a PDF')),/header/);
  await assert.rejects(()=>validatePdf(new TextEncoder().encode('%PDF-1.7\ntruncated')),/incomplete/);
});
test('stale plans and unresolved identifying fields can never export', async () => {
  const source=await read(),p=structuredClone(DEFAULT_PRESET),plan=await analyzeBatch(source.info,source.pages,p);
  await assert.rejects(()=>exportBundle(source,{...p,filenameTemplate:'{index}_{author}'},{},plan.id),/changed/);
  const issues=await read('tests/fixtures/issues.pdf'),bad=await analyzeBatch(issues.info,issues.pages,p);
  assert.ok(bad.blockingCount>0);await assert.rejects(()=>exportBundle(issues,p,{},bad.id),/Resolve every/);
});
test('cancellation during load and export returns no partial archive, and retry succeeds', async () => {
  const loadAbort=new AbortController();
  await assert.rejects(()=>fixture('public/samples/reportbatch-sample.pdf').then(bytes=>loadDocument(bytes,'sample',open,()=>loadAbort.abort(),loadAbort.signal)),{name:'AbortError'});
  const source=await read(),p=structuredClone(DEFAULT_PRESET),plan=await analyzeBatch(source.info,source.pages,p),abort=new AbortController();
  await assert.rejects(()=>exportBundle(source,p,{},plan.id,()=>abort.abort(),abort.signal),{name:'AbortError'});
  assert.equal((await exportBundle(source,p,{},plan.id)).manifest.outputs.length,4);
  assert.equal(abortError().name,'AbortError');
});
test('actual advertised source-size boundary accepts 30 MiB and rejects the next byte', {timeout:120000}, async () => {
  const exact=await makeSizedFixture(MAX_FILE_BYTES);assert.equal(exact.length,MAX_FILE_BYTES);
  const loaded=await loadDocument(exact,'30-MiB.pdf',open);assert.equal(loaded.info.pageCount,1);
  const tooBig=new Uint8Array(MAX_FILE_BYTES+1);tooBig.set(exact);
  await assert.rejects(()=>validatePdf(tooBig),/30 MiB/);
});
test('actual page-count boundary accepts 500 pages and rejects 501', {timeout:120000}, async () => {
  const reports=Array.from({length:MAX_PAGES},(_,i)=>({...SAMPLE_REPORTS[0],author:`Synthetic Person ${String(i+1).padStart(3,'0')}`}));
  const loaded=await loadDocument(await makeFixture(reports),'500-pages.pdf',open);
  assert.equal(loaded.pages.length,MAX_PAGES);
  const plan=await analyzeBatch(loaded.info,loaded.pages,structuredClone(DEFAULT_PRESET));assert.equal(plan.blockingCount,0);
  await assert.rejects(()=>makeFixture([...reports,reports[0]]).then(validatePdf),/1–500/);
});
