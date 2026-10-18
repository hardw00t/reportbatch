import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { request } from 'node:http';

// Exercise the actual server with synthetic static files; no browser or registry.
test('local static server enforces methods, host, paths and privacy/security headers', {timeout:15000}, async()=>{
  const cwd=await mkdtemp(join(tmpdir(),'reportbatch-server-'));
  await mkdir(join(cwd,'dist'));
  await writeFile(join(cwd,'dist','index.html'),'<title>Synthetic server check</title>');
  await writeFile(join(cwd,'dist','app.js'),'export const synthetic = true;');
  await writeFile(join(cwd,'outside.txt'),'OUTSIDE-DIST-SENTINEL');
  await writeFile(join(cwd,'dist','.env'),'HIDDEN-FILE-SENTINEL');
  const port=20000+Math.floor(Math.random()*20000);
  const child=spawn(process.execPath,[resolve('scripts/serve.mjs')],{cwd,env:{...process.env,REPORTBATCH_PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let output='';child.stderr.on('data',chunk=>{output+=String(chunk);});
  const ready=new Promise<void>((resolve,reject)=>{
    child.stdout.on('data',chunk=>{output+=String(chunk);if(output.includes('ReportBatch local:'))resolve();});
    child.once('error',reject);child.once('exit',code=>reject(new Error(`Server exited ${code}: ${output}`)));
  });
  const get=(path:string,method='GET',host=`127.0.0.1:${port}`)=>new Promise<{status:number;headers:import('node:http').IncomingHttpHeaders;body:string}>((resolve,reject)=>{
    const req=request({hostname:'127.0.0.1',port,path,method,headers:{Host:host}},res=>{
      const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode!,headers:res.headers,body:Buffer.concat(chunks).toString()}));
    });req.on('error',reject);req.end();
  });
  try {
    await ready;
    const root=await get('/');assert.equal(root.status,200);assert.match(root.body,/Synthetic server check/);
    const head=await get('/','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');
    const js=await get('/app.js');assert.match(String(js.headers['content-type']),/javascript/);
    const probes=[await get('/','POST'),await get('/','PUT'),await get('/','GET','attacker.invalid'),await get('/.env'),await get('/%2eenv'),await get('/%2e%2e%2foutside.txt'),await get('/..%5coutside.txt'),await get('/%00'),await get('/%ZZ'),await get('/missing')];
    assert.deepEqual(probes.map(p=>p.status),[405,405,403,404,404,404,404,404,400,404]);
    for(const response of [root,head,js,...probes]) {
      assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.headers['referrer-policy'],'no-referrer');
      assert.equal(response.headers['x-content-type-options'],'nosniff');assert.equal(response.headers['x-frame-options'],'DENY');
      assert.match(String(response.headers['content-security-policy']),/connect-src 'self'/);
      assert.match(String(response.headers['content-security-policy']),/object-src 'none'/);
      assert.ok(!String(response.headers['content-security-policy']).includes('unsafe-eval'));
      assert.equal(response.headers['access-control-allow-origin'],undefined);
      assert.ok(!response.body.includes('SENTINEL'));
    }
    assert.ok(!output.includes('outside.txt')&&!output.includes('.env'),'server does not log request paths');
  } finally {
    child.kill('SIGTERM');
    if(child.exitCode===null)await new Promise<void>(resolve=>child.once('exit',()=>resolve()));
    await rm(cwd,{recursive:true,force:true});
  }
});
