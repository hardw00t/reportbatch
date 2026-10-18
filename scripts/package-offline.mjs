import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
const sha256 = data => createHash('sha256').update(data).digest('hex');
const files = {};
async function collect(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile()) files[path] = new Uint8Array(await readFile(path));
    else throw new Error(`Unsupported artifact entry: ${path}`);
  }
}
await collect('dist');
if (!files['dist/index.html']) throw new Error('Build production assets first.');
files['serve.mjs'] = new Uint8Array(await readFile('scripts/serve.mjs'));
files['LICENSE'] = new Uint8Array(await readFile('LICENSE'));
files['START-HERE.txt'] = new TextEncoder().encode(`ReportBatch offline local edition\n\nRequires an already-installed Node.js 22.13 or newer. No npm install is needed.\nExtract the entire ZIP into a new directory. Open a terminal in that directory.\n1. Run: node verify.mjs\n2. Run: node serve.mjs\n3. Open http://127.0.0.1:4173 in your browser. Stop with Ctrl-C.\nDo not open index.html using file://. Keep all dist/vendor files and notices.\nThe server binds only to loopback. No document-upload or telemetry endpoint exists.\nVerification checks package completeness/integrity, not publisher authenticity.\nObtain the ZIP and its external SHA-256 from the trusted release channel.\n\nSearchable fixed-layout PDFs only; maximum 500 pages / 30 MiB. Review every filename\nand page range. Splitting is not redaction or a confidentiality boundary.\nShared resources can retain non-visible content. Protect the manifest like PDFs.\nNo OCR, forms, signatures, annotations, attachments, layers or encrypted PDFs.\nBrowser save completion must be checked in Downloads. No secure-erasure claim.\nSee the release evidence for actually validated platforms and known limitations.\n`);
files['verify.mjs'] = new TextEncoder().encode(`import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest=JSON.parse(await readFile('integrity.json','utf8'));
const actual=[];
async function walk(dir){for(const e of await readdir(dir||'.',{withFileTypes:true})){const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())await walk(p);else if(e.isFile())actual.push(p);else throw Error('Unsupported entry: '+p);}}
await walk('');
const expected=Object.keys(manifest.files).sort();
if(JSON.stringify(actual.filter(p=>p!=='integrity.json').sort())!==JSON.stringify(expected))throw Error('Package inventory mismatch');
for(const p of expected){const b=await readFile(p);if(b.length!==manifest.files[p].bytes||createHash('sha256').update(b).digest('hex')!==manifest.files[p].sha256)throw Error('Integrity mismatch: '+p);}
console.log('Package inventory and SHA-256 verified: '+expected.length+' files.');
`);
const entries = Object.fromEntries(Object.keys(files).sort().map(path=>[path,{bytes:files[path].length,sha256:sha256(files[path])}]));
files['integrity.json'] = new TextEncoder().encode(JSON.stringify({schemaVersion:1,files:entries},null,2)+'\n');
const archive=zipSync(Object.fromEntries(Object.keys(files).sort().map(path=>[path,[files[path],{mtime:new Date(2000, 0, 1, 0, 0, 0)}]])),{level:6});
await mkdir('release',{recursive:true});
await writeFile('release/reportbatch-offline.zip',archive);
await writeFile('release/reportbatch-offline.zip.sha256',`${sha256(archive)}  reportbatch-offline.zip\n`);
console.log(`Offline package: ${archive.length} bytes, SHA-256 ${sha256(archive)}`);
