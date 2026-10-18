import { test, expect } from '@playwright/test';
import type { Page, Download } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { unzipSync, strFromU8 } from 'fflate';
import { DEFAULT_PRESET, MAX_FILE_BYTES } from '../../src/core/preset';
import { makeFixture, SAMPLE_REPORTS } from '../../scripts/fixture-lib';
import type { Manifest } from '../../src/core/types';

const pdfInput = (page:Page) => page.getByLabel('Choose PDF batch');
async function sample(page:Page) {
  await page.goto('/');await page.getByRole('button',{name:'Try the sample'}).click();
  await expect(page.getByText('4 searchable pages ·',{exact:false})).toBeVisible();
  await expect(page.getByText('Rendering page',{exact:false})).toHaveCount(0);
}
async function check(page:Page) {
  await page.getByRole('button',{name:/Run (full-batch preflight|preflight again)/}).click();
  await expect(page.getByRole('heading',{name:'A clear view of every output.'})).toBeVisible();
  await expect(page.getByText('Page coverage checked',{exact:true})).toBeVisible();
}
async function openDownload(download:Download) {
  const path=await download.path();expect(path).toBeTruthy();
  const bytes=await readFile(path!);const files=unzipSync(bytes);
  const manifest=JSON.parse(strFromU8(files['manifest.json'])) as Manifest;
  expect(Object.keys(files).sort()).toEqual([...manifest.outputs.map(o=>o.filename),'manifest.json'].sort());
  expect(manifest.outputs.flatMap(o=>o.sourcePages)).toEqual(Array.from({length:manifest.source.pageCount},(_,i)=>i+1));
  for(const output of manifest.outputs)expect((await PDFDocument.load(files[output.filename])).getPageCount()).toBe(output.pageCount);
  return {bytes,files,manifest};
}

test('sample tour exports verified PDFs, reopens the download, and preserves the rendered first page', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await sample(page);
  const before=await page.getByRole('img',{name:/PDF preview/}).screenshot();
  await check(page);await expect(page.getByRole('row')).toHaveCount(5);
  const exportButton=page.getByRole('button',{name:'Export verified ZIP'});await expect(exportButton).toBeDisabled();
  await page.getByLabel('I reviewed every filename, page range and notice.').check();
  const downloadPromise=page.waitForEvent('download');await exportButton.click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('reportbatch-export.zip');
  const {bytes,files,manifest}=await openDownload(download);expect(manifest.outputs).toHaveLength(4);
  await expect(page.getByText('4 PDFs verified · 4 pages accounted for',{exact:false})).toBeVisible();
  await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/sample-export.zip',bytes);
  await page.screenshot({path:'docs/evidence/review-desktop.png',fullPage:true});
  const first=manifest.outputs[0];
  await pdfInput(page).setInputFiles({name:first.filename,mimeType:'application/pdf',buffer:Buffer.from(files[first.filename])});
  await expect(page.getByText('1 searchable pages ·',{exact:false})).toBeVisible();
  await expect(page.getByText('Rendering page',{exact:false})).toHaveCount(0);
  const after=await page.getByRole('img',{name:/PDF preview/}).screenshot();
  expect(after.equals(before)).toBe(true);
  expect(errors).toEqual([]);
});

test('marker boundaries preserve continuations; orphan and missing markers block export', async ({page}) => {
  await page.goto('/');await pdfInput(page).setInputFiles('public/samples/grouped-reports.pdf');
  await expect(page.getByText('6 searchable pages ·',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Split',exact:true}).click();await page.getByLabel('Report boundaries').selectOption('marker');
  await check(page);await expect(page.getByRole('row')).toHaveCount(4);
  await page.getByLabel('I reviewed every filename, page range and notice.').check();
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export verified ZIP'}).click();
  const {manifest}=await openDownload(await wait);expect(manifest.outputs.map(o=>o.sourcePages)).toEqual([[1,2],[3],[4,5,6]]);
  await page.getByLabel('Start marker',{exact:true}).fill('NOT A REAL MARKER');
  await expect(page.getByLabel('I reviewed every filename, page range and notice.')).not.toBeChecked();
  await page.getByRole('button',{name:'Run preflight again'}).click();
  await expect(page.getByText('No exact start markers found.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Export verified ZIP'})).toBeDisabled();
  const orphan=await makeFixture([{...SAMPLE_REPORTS[0],pages:2},SAMPLE_REPORTS[1]]);
  const doc=await PDFDocument.load(orphan);doc.removePage(0);
  await pdfInput(page).setInputFiles({name:'orphan-first-page.pdf',mimeType:'application/pdf',buffer:Buffer.from(await doc.save())});
  await expect(page.getByText('2 searchable pages ·',{exact:false})).toBeVisible();
  await page.getByLabel('Start marker',{exact:true}).fill('REPORT START');
  await page.getByRole('button',{name:'Run full-batch preflight'}).click();
  await expect(page.getByText(/Pages 1–1 precede the first start marker/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Export verified ZIP'})).toBeDisabled();
});

test('missing and ambiguous fields require corrections; duplicate names block until deliberately resolved', async ({page}) => {
  await page.goto('/');await pdfInput(page).setInputFiles('tests/fixtures/issues.pdf');
  await expect(page.getByText('3 searchable pages ·',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Run full-batch preflight'}).click();
  await expect(page.getByRole('button',{name:'Export verified ZIP'})).toBeDisabled();
  await expect(page.getByText('Ambiguous: 2 matching lines',{exact:false}).first()).toBeVisible();
  await page.getByLabel('Verified Author',{exact:true}).fill('Alex Morgan');
  await page.getByRole('button',{name:'Review 003'}).click();await page.getByLabel('Verified Report type').fill('Survey');
  await page.getByRole('button',{name:'Recheck corrections'}).click();
  await expect(page.getByText('Duplicate filename.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Review 002'}).click();await page.getByLabel('Verified Author',{exact:true}).fill('Alex Morgan second report');
  await page.getByRole('button',{name:'Recheck corrections'}).click();await expect(page.getByText('Page coverage checked',{exact:true})).toBeVisible();
  await page.getByLabel('I reviewed every filename, page range and notice.').check();
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export verified ZIP'}).click();
  const {manifest}=await openDownload(await wait);expect(manifest.outputs[1].fields.author.manual).toBe(true);
});

test('preset storage/export contains rules only; editing or importing invalidates review', async ({page}) => {
  await sample(page);await check(page);await page.getByLabel('I reviewed every filename, page range and notice.').check();
  await page.getByLabel('Layout name',{exact:true}).fill('My layout');
  await expect(page.getByRole('button',{name:'Export verified ZIP'})).toBeDisabled();
  await page.getByRole('button',{name:'Save on this device'}).click();
  const stored=await page.evaluate(()=>JSON.stringify({...localStorage}));
  expect(stored).toContain('My layout');expect(stored).not.toContain('Alex Morgan');expect(stored).not.toContain('reportbatch-sample.pdf');
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export preset',exact:true}).click();
  const presetDownload=await wait;const presetPath=await presetDownload.path();
  const json=await readFile(presetPath!,'utf8');
  expect(JSON.parse(json).schemaVersion).toBe(1);expect(json).not.toContain('Alex Morgan');
  await page.getByLabel('Import layout preset').setInputFiles({name:'malicious.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...DEFAULT_PRESET,documentText:'not allowed'}))});
  await expect(page.getByRole('alert')).toContainText('unsupported properties');
  await page.getByLabel('Import layout preset').setInputFiles({name:'good.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...DEFAULT_PRESET,name:'Imported layout'}))});
  await expect(page.getByLabel('Layout name',{exact:true})).toHaveValue('Imported layout');
  await expect(page.getByLabel('I reviewed every filename, page range and notice.')).not.toBeChecked();
  await page.getByRole('button',{name:'Clear document from memory'}).click();await expect(page.getByRole('button',{name:'Try the sample'})).toBeVisible();
  await page.getByText('Privacy, recovery & saved layouts',{exact:true}).click();await page.getByRole('button',{name:'Clear saved layouts'}).click();
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});

test('scanned, encrypted, corrupt, attached and form documents produce errors without downloads', async ({page}) => {
  await page.goto('/');const downloads:Download[]=[];page.on('download',d=>downloads.push(d));
  for(const [name,message] of [['scan','no usable searchable text'],['encrypted','Encrypted or password-protected'],['corrupt','could not be parsed safely'],['attachment','attachments'],['form','Forms, signatures']] as const) {
    await pdfInput(page).setInputFiles(`tests/fixtures/${name}.pdf`);
    await expect(page.getByRole('alert')).toContainText(message);await expect(page.getByRole('button',{name:'Try the sample'})).toBeVisible();
  }
  await pdfInput(page).setInputFiles({name:'oversize.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(MAX_FILE_BYTES+1)});
  await expect(page.getByRole('alert')).toContainText('30 MiB');expect(downloads).toHaveLength(0);
});

test('cancel/retry and rapid double export never produce stale or partial downloads', async ({page}) => {
  await page.goto('/');
  const bytes=await makeFixture(Array.from({length:100},(_,i)=>({...SAMPLE_REPORTS[0],author:`Person ${i}`})));
  await pdfInput(page).setInputFiles({name:'100-reports.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
  await page.getByRole('button',{name:'Cancel operation'}).click();
  await expect(page.getByText('Cancelled. No incomplete download',{exact:false})).toBeVisible();
  await pdfInput(page).setInputFiles({name:'100-reports.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
  await expect(page.getByText('100 searchable pages ·',{exact:false})).toBeVisible();await check(page);
  await page.getByLabel('I reviewed every filename, page range and notice.').check();
  const downloads:Download[]=[];page.on('download',d=>downloads.push(d));
  await page.getByRole('button',{name:'Export verified ZIP'}).click();await page.getByRole('button',{name:'Cancel operation'}).click();
  await expect(page.getByText('Cancelled. No incomplete download',{exact:false})).toBeVisible();expect(downloads).toHaveLength(0);
  await check(page);await page.getByLabel('I reviewed every filename, page range and notice.').check();
  const wait=page.waitForEvent('download');
  // Two synchronous DOM clicks model a repeated activation before the next render.
  await page.getByRole('button',{name:'Export verified ZIP'}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
  await openDownload(await wait);await expect(page.getByText('100 PDFs verified',{exact:false})).toBeVisible();
  expect(downloads).toHaveLength(1);
});

test('offline document processing has no network transmissions and no document persistence', async ({page,context}) => {
  const requests:{url:string;method:string;postData:string|null}[]=[];
  context.on('request',request=>requests.push({url:request.url(),method:request.method(),postData:request.postData()}));
  await sample(page);await check(page);
  // All application, worker, sample and font assets are now loaded. No server is needed for processing.
  await context.setOffline(true);await page.getByLabel('I reviewed every filename, page range and notice.').check();
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export verified ZIP'}).click();await openDownload(await wait);
  expect(requests.every(r=>new URL(r.url).origin==='http://127.0.0.1:4173' && r.method==='GET' && r.postData===null)).toBe(true);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  expect(await page.evaluate(async()=>({session:sessionStorage.length,databases:await indexedDB.databases(),caches:await caches.keys()}))).toEqual({session:0,databases:[],caches:[]});
  await context.setOffline(false);
});

test('keyboard path and automated accessibility scan cover empty, configured and review states', async ({page}) => {
  await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to workbench'})).toBeFocused();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([]);
  await sample(page);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([]);
  const left=page.getByLabel('Left %',{exact:true});await left.focus();await page.keyboard.press('ArrowUp');await expect(left).toHaveValue('4.1');
  await left.fill('4');await page.getByRole('button',{name:'Run full-batch preflight'}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'A clear view of every output.'})).toBeFocused();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();expect(result.violations).toEqual([]);
  await page.getByLabel('I reviewed every filename, page range and notice.').focus();await page.keyboard.press('Space');
  await expect(page.getByRole('button',{name:'Export verified ZIP'})).toBeEnabled();
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export verified ZIP'}).focus();await page.keyboard.press('Enter');await openDownload(await wait);
});

test('mobile layout, region drawing and imported numeric region controls stay usable', async ({page}) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await mkdir('docs/evidence',{recursive:true});await page.screenshot({path:'docs/evidence/empty-mobile.png',fullPage:true});
  await sample(page);await page.getByRole('button',{name:'Draw on page'}).click();
  const canvas=page.getByRole('img',{name:/PDF preview/});await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width*.05,box!.y+box!.height*.06);await page.mouse.down();await page.mouse.move(box!.x+box!.width*.95,box!.y+box!.height*.38,{steps:6});await page.mouse.up();
  await expect(page.getByLabel('Left %',{exact:true})).toHaveValue('5');await expect(page.getByLabel('Width %',{exact:true})).toHaveValue('90');
  await check(page);await page.screenshot({path:'docs/evidence/review-mobile.png',fullPage:true});
  const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+1)}));
  expect(layout.scrollWidth,JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
  const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations;expect(violations).toEqual([]);
});

test('delayed sample is latched and cancellation prevents late replacement of a local batch', async ({page}) => {
  const sampleBytes=await readFile('public/samples/reportbatch-sample.pdf');
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  let requests=0;
  await page.route('**/samples/reportbatch-sample.pdf',async route=>{
    requests++;await gate;await route.fulfill({contentType:'application/pdf',body:sampleBytes}).catch(()=>{});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Try the sample'}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
  await expect(page.getByRole('button',{name:'Cancel operation'})).toBeVisible();
  await expect(pdfInput(page)).toBeDisabled();
  await page.getByRole('button',{name:'Cancel operation'}).click();
  await pdfInput(page).setInputFiles('public/samples/grouped-reports.pdf');
  await expect(page.getByText('6 searchable pages ·',{exact:false})).toBeVisible();
  release();
  await check(page);
  await expect(page.getByText('6 searchable pages ·',{exact:false})).toBeVisible();
  expect(requests).toBeLessThanOrEqual(1);
});
