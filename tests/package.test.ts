import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { unzipSync } from 'fflate';

test('offline package is deterministic, self-contained and detects tampering/extra files', async () => {
  const dir=await mkdtemp(join(tmpdir(),'reportbatch-package-'));
  try {
    await mkdir(join(dir,'dist/vendor'),{recursive:true});await mkdir(join(dir,'scripts'));
    await writeFile(join(dir,'dist/index.html'),'synthetic production test');
    await writeFile(join(dir,'dist/vendor/asset.bin'),new Uint8Array([0,1,2,255]));
    await writeFile(join(dir,'scripts/serve.mjs'),await readFile('scripts/serve.mjs'));
    await writeFile(join(dir,'LICENSE'),'synthetic test license');
    const script=resolve('scripts/package-offline.mjs');
    execFileSync(process.execPath,[script],{cwd:dir});
    const first=await readFile(join(dir,'release/reportbatch-offline.zip'));
    execFileSync(process.execPath,[script],{cwd:dir});
    assert.deepEqual(await readFile(join(dir,'release/reportbatch-offline.zip')),first);
    const extracted=join(dir,'extracted');await mkdir(extracted);
    for(const [path,bytes] of Object.entries(unzipSync(first))){await mkdir(dirname(join(extracted,path)),{recursive:true});await writeFile(join(extracted,path),bytes);}
    assert.match(execFileSync(process.execPath,['verify.mjs'],{cwd:extracted,encoding:'utf8'}),/verified/);
    await writeFile(join(extracted,'unexpected.txt'),'extra');
    assert.throws(()=>execFileSync(process.execPath,['verify.mjs'],{cwd:extracted,stdio:'pipe'}));
    await rm(join(extracted,'unexpected.txt'));
    await writeFile(join(extracted,'dist/index.html'),'tampered');
    assert.throws(()=>execFileSync(process.execPath,['verify.mjs'],{cwd:extracted,stdio:'pipe'}));
  } finally {await rm(dir,{recursive:true,force:true});}
});
