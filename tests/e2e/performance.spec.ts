import { test, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { platform, arch, cpus, totalmem } from 'node:os';
import { PDFDocument } from 'pdf-lib';
import { unzipSync, strFromU8 } from 'fflate';
import { makeFixture, makeSizedFixture, SAMPLE_REPORTS } from '../../scripts/fixture-lib';
import { MAX_FILE_BYTES, MAX_PAGES } from '../../src/core/preset';
import type { Manifest } from '../../src/core/types';

test('500 reports: full preflight, verified ZIP, actual page counts and bounded browser RSS', async ({page,browser}) => {
  test.setTimeout(120_000);
  const bytes=await makeFixture(Array.from({length:MAX_PAGES},(_,i)=>({...SAMPLE_REPORTS[0],author:`Synthetic Person ${String(i+1).padStart(3,'0')}`})));
  const cdp=await browser.newBrowserCDPSession();
  let peakRSSKiB=0,samples=0,inFlight:Promise<void>|null=null;
  const sampleMemory=()=>{
    if(inFlight)return inFlight;
    inFlight=(async()=>{
      const info=await cdp.send('SystemInfo.getProcessInfo');
      const pids=info.processInfo.map(p=>String(p.id)).join(',');
      const rss=execFileSync('ps',['-o','rss=','-p',pids],{encoding:'utf8'}).trim().split(/\s+/).map(Number).reduce((a,b)=>a+b,0);
      peakRSSKiB=Math.max(peakRSSKiB,rss);samples++;
    })().finally(()=>{inFlight=null;});
    return inFlight;
  };
  await sampleMemory();const baselineRSSKiB=peakRSSKiB;
  const timer=setInterval(()=>void sampleMemory().catch(()=>{}),200);
  const started=performance.now();
  try {
    await page.goto('/');
    await page.getByLabel('Choose PDF batch').setInputFiles({name:'500-synthetic-reports.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
    await expect(page.getByText('500 searchable pages ·',{exact:false})).toBeVisible({timeout:60_000});
    const loadMs=performance.now()-started;
    await page.getByRole('button',{name:'Run full-batch preflight'}).click();
    await expect(page.getByText('Page coverage checked',{exact:true})).toBeVisible();
    const preflightMs=performance.now()-started-loadMs;
    await page.getByLabel('I reviewed every filename, page range and notice.').check();
    const beginExport=performance.now(),wait=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export verified ZIP'}).click();const download=await wait;
    const exportMs=performance.now()-beginExport;
    const archiveBytes=await readFile((await download.path())!),archive=unzipSync(archiveBytes);
    const manifest=JSON.parse(strFromU8(archive['manifest.json'])) as Manifest;
    expect(manifest.outputs).toHaveLength(MAX_PAGES);
    expect(manifest.outputs.flatMap(o=>o.sourcePages)).toEqual(Array.from({length:MAX_PAGES},(_,i)=>i+1));
    for(const output of manifest.outputs)expect((await PDFDocument.load(archive[output.filename])).getPageCount()).toBe(1);
    await sampleMemory();
    const elapsedMs=performance.now()-started;
    expect(samples).toBeGreaterThan(3);expect(peakRSSKiB).toBeLessThan(1_500_000);expect(elapsedMs).toBeLessThan(90_000);
    await mkdir('docs/evidence',{recursive:true});
    await writeFile('docs/evidence/performance-500.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,hostMemoryBytes:totalmem(),pages:MAX_PAGES,sourceBytes:bytes.length,archiveBytes:archiveBytes.length,loadMs:Math.round(loadMs),preflightMs:Math.round(preflightMs),exportMs:Math.round(exportMs),elapsedMs:Math.round(elapsedMs),baselineRSSKiB,peakRSSKiB,samples,memoryMethod:'Sum of RSS for Chrome process IDs returned by CDP SystemInfo.getProcessInfo, sampled via ps every 200ms; includes shared pages and is not a precise heap measurement.',verification:'Actual downloaded ZIP reopened; all 500 PDF page counts reopened, ordered source page partition 1..500 verified.'},null,2)+'\n');
  } finally {clearInterval(timer);await inFlight;await cdp.detach();}
});

test('actual 30 MiB input loads and exports; next byte and page 501 reject', async ({page,browser}) => {
  test.setTimeout(120_000);
  const bytes=await makeSizedFixture(MAX_FILE_BYTES);expect(bytes.length).toBe(MAX_FILE_BYTES);
  const start=performance.now();await page.goto('/');
  await page.getByLabel('Choose PDF batch').setInputFiles({name:'30-MiB-synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
  await expect(page.getByText('1 searchable pages ·',{exact:false})).toBeVisible({timeout:60_000});
  await page.getByRole('button',{name:'Run full-batch preflight'}).click();await expect(page.getByText('Page coverage checked',{exact:true})).toBeVisible();
  await page.getByLabel('I reviewed every filename, page range and notice.').check();
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export verified ZIP'}).click();
  const zip=unzipSync(await readFile((await (await wait).path())!));const manifest=JSON.parse(strFromU8(zip['manifest.json'])) as Manifest;
  expect(manifest.outputs).toHaveLength(1);expect((await PDFDocument.load(zip[manifest.outputs[0].filename])).getPageCount()).toBe(1);
  const elapsedMs=Math.round(performance.now()-start);
  await page.getByLabel('Choose PDF batch').setInputFiles({name:'oversize.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(MAX_FILE_BYTES+1)});
  await expect(page.getByRole('alert')).toContainText('30 MiB');
  const extraPage=await makeFixture(Array.from({length:501},()=>SAMPLE_REPORTS[0]));
  await page.getByLabel('Choose PDF batch').setInputFiles({name:'501-pages.pdf',mimeType:'application/pdf',buffer:Buffer.from(extraPage)});
  await expect(page.getByRole('alert')).toContainText('1–500');
  await mkdir('docs/evidence',{recursive:true});await writeFile('docs/evidence/performance-size.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),sourceBytes:MAX_FILE_BYTES,elapsedMs,verification:'30 MiB input loaded, preflighted, exported, archive reopened and PDF count checked; 30 MiB + 1 byte and 501 pages rejected.'},null,2)+'\n');
});
