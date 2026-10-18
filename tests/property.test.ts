import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBatch, assertPartition, collisionKey, groupPages, sanitizeFilename } from '../src/core/plan';
import { DEFAULT_PRESET, parsePreset, serializePreset, validatePreset } from '../src/core/preset';
import { buildLines } from '../src/core/text';
import type { PageText, Token } from '../src/core/types';

// Reproducible randomized coverage, with no external data or property-test dependency.
function random(seed:number) { let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;}; }
function makePage(number:number,start:boolean):PageText {
  const tokens:Token[]=(start?['REPORT START','Author: Synthetic']:['Continuation']).map((text,i)=>({text,box:{x:.1,y:.04+i*.07,width:.35,height:.02},bx:60,by:40+i*56,dx:1,dy:0,advance:210,fontSize:12}));
  return {number,width:600,height:800,rotation:0,tokens,lines:buildLines(tokens)};
}

test('seeded filename corpus always yields bounded flat safe basenames',()=>{
  const rnd=random(0x52425044),alphabet=['a','Z','é','e\u0301','ǰ','J\u030c','Ａ','ß','Σ','ς','中','😀',' ','.','/','\\',':','*','?','<','>','|','\u0000','\u202e','\u2066'];
  const prefixes=['CON','PRN','AUX','NUL','COM1','COM¹','LPT9','ＣＯＮ','..',''];
  for(let i=0;i<2500;i++) {
    let input=prefixes[i%prefixes.length];
    const count=Math.floor(rnd()*260);
    for(let j=0;j<count;j++)input+=alphabet[Math.floor(rnd()*alphabet.length)];
    const {filename}=sanitizeFilename(input);
    assert.ok(filename.endsWith('.pdf'));assert.ok(new TextEncoder().encode(filename).byteLength<=180);
    assert.ok(!/[<>:"/\\|?*\p{Cc}\p{Cf}]/u.test(filename));assert.ok(!/^[ .]/u.test(filename));
    assert.ok(!/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(filename.normalize('NFKC')));
    assert.equal(sanitizeFilename(filename).filename,filename,'sanitization is idempotent');
    assert.equal(collisionKey(filename),collisionKey(filename.normalize('NFD')));
  }
});

test('seeded marker partitions preserve every page and never infer absent starts',()=>{
  const rnd=random(0x50414745),p=structuredClone(DEFAULT_PRESET);p.grouping.mode='marker';
  for(let run=0;run<400;run++) {
    const count=1+Math.floor(rnd()*80),starts=[1];
    for(let n=2;n<=count;n++)if(rnd()<.25)starts.push(n);
    const pages=Array.from({length:count},(_,i)=>makePage(i+1,starts.includes(i+1)));
    const result=groupPages(pages,p);assert.deepEqual(result.issues,[]);assertPartition(result.groups,count);
    assert.deepEqual(result.groups.map(group=>group[0]),starts);
    const orphan=pages.map(page=>({...page,tokens:page.number===1?[]:page.tokens,lines:page.number===1?[]:page.lines}));
    assert.ok(groupPages(orphan,p).issues.length>0);
  }
});

test('seeded planning is deterministic and every correction changes its review identity',async()=>{
  const rnd=random(0x504c414e),p=structuredClone(DEFAULT_PRESET);
  p.fields=[{...p.fields[1],region:{x:.04,y:.04,width:.92,height:.36}}];p.filenameTemplate='{index}_{author}';
  for(let run=0;run<100;run++) {
    const count=1+Math.floor(rnd()*20),pages=Array.from({length:count},(_,i)=>makePage(i+1,true));
    const doc={name:'synthetic.pdf',byteLength:100,pageCount:count,sha256:`synthetic-${run}`};
    const first=await analyzeBatch(doc,pages,p),again=await analyzeBatch(doc,pages,structuredClone(p));
    assert.deepEqual(first,again);assert.equal(first.blockingCount,0);assertPartition(first.outputs.map(o=>o.pages),count);
    const changed=await analyzeBatch(doc,pages,p,{p1:{author:`Correction ${run}`}});
    assert.notEqual(changed.id,first.id);assert.equal(changed.outputs[0].fields.author.manual,true);
  }
});

test('preset nested allowlists and nonfinite geometry fail closed',()=>{
  const p=structuredClone(DEFAULT_PRESET);
  for(const value of [NaN,Infinity,-Infinity]) for(const key of ['x','y','width','height']) {
    const bad=structuredClone(p);Object.assign(bad.fields[0].region,{[key]:value});assert.throws(()=>validatePreset(bad));
  }
  for(const key of ['__proto__','constructor','documentBytes','sourceText','url']) {
    for(const location of ['preset','field','region','grouping']) {
      const raw=JSON.parse(serializePreset(p));
      const target=location==='preset'?raw:location==='field'?raw.fields[0]:location==='region'?raw.fields[0].region:raw.grouping;
      Object.defineProperty(target,key,{value:'synthetic',enumerable:true});
      assert.throws(()=>parsePreset(JSON.stringify(raw)));
    }
  }
  assert.deepEqual(parsePreset(serializePreset(p)),p);
});
