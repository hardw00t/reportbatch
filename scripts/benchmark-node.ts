import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { platform, arch, cpus } from 'node:os';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { makeFixture, SAMPLE_REPORTS } from './fixture-lib';
import { loadDocument, exportBundle } from '../src/core/pdf';
import { analyzeBatch, assertPartition } from '../src/core/plan';
import { DEFAULT_PRESET } from '../src/core/preset';

const base=resolve('node_modules/pdfjs-dist');
const open=async(data:Uint8Array)=>getDocument({data,enableXfa:false,stopAtErrors:true,useSystemFonts:true,useWorkerFetch:false,standardFontDataUrl:base+'/standard_fonts/',cMapUrl:base+'/cmaps/',cMapPacked:true,wasmUrl:base+'/wasm/',verbosity:0}).promise;
const bytes=await makeFixture(Array.from({length:500},(_,i)=>({...SAMPLE_REPORTS[0],author:`Synthetic Person ${String(i+1).padStart(3,'0')}`})));
const started=performance.now();
const source=await loadDocument(bytes,'500-synthetic-reports.pdf',open);
const loaded=performance.now();
const plan=await analyzeBatch(source.info,source.pages,structuredClone(DEFAULT_PRESET));
if(plan.blockingCount)throw Error('Synthetic benchmark unexpectedly blocked');
const analyzed=performance.now();
const result=await exportBundle(source,plan.preset,{},plan.id);
const exported=performance.now();
const archive=unzipSync(result.bytes);
assertPartition(result.manifest.outputs.map(output=>output.sourcePages),500);
for(const output of result.manifest.outputs) {
  if((await PDFDocument.load(archive[output.filename])).getPageCount()!==1)throw Error('Output page inventory mismatch');
}
const evidence={date:new Date().toISOString(),scope:'Node-only engine benchmark; not browser performance or UI verification',node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,pages:500,sourceBytes:bytes.length,archiveBytes:result.bytes.length,loadMs:Math.round(loaded-started),preflightMs:Math.round(analyzed-loaded),exportMs:Math.round(exported-analyzed),elapsedIncludingIndependentReopenMs:Math.round(performance.now()-started),peakProcessRSSKiB:process.resourceUsage().maxRSS,memoryMethod:'OS process high-water RSS via process.resourceUsage().maxRSS; includes fixture generation and Node parser, excludes browser and worker topology',verification:'500 output PDFs independently reopened from ZIP, one page each; ordered source partition 1..500 verified; engine export also verifies hashes and hidden-page graph'};
await mkdir('docs/evidence',{recursive:true});
await writeFile('docs/evidence/performance-node-500.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
