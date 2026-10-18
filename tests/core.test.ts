import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBatch, assertPartition, collisionKey, groupPages, sanitizeFilename } from '../src/core/plan';
import { DEFAULT_PRESET, MAX_PRESET_BYTES, parsePreset, serializePreset, validatePreset } from '../src/core/preset';
import { buildLines, extractField } from '../src/core/text';
import type { DocumentInfo, PageText, Preset, Token } from '../src/core/types';

const preset = (): Preset => structuredClone(DEFAULT_PRESET);
function page(number=1, lines=['REPORT START','Date: 03/04/2026','Author: Zoë García','Type: Résumé']): PageText {
  const tokens: Token[] = lines.map((text,i) => ({text,box:{x:.08,y:.05+i*.05,width:.5,height:.02},bx:48,by:45+i*40,dx:1,dy:0,advance:300,fontSize:12}));
  return {number,width:600,height:800,rotation:0,tokens,lines:buildLines(tokens)};
}
function info(count: number): DocumentInfo { return {name:'synthetic.pdf',byteLength:1000,pageCount:count,sha256:'synthetic-source-sha'}; }

test('prefix extraction preserves Unicode and dates as literal content', () => {
  const p=page(), rules=preset().fields;
  assert.equal(extractField(p,rules[0]).value,'03/04/2026');
  assert.equal(extractField(p,rules[1]).value,'Zoë García');
  assert.equal(extractField(p,rules[2]).value,'Résumé');
});
test('missing, identical repeated and conflicting values all need review', () => {
  const author=preset().fields[1];
  for(const lines of [['Date: 2026'],['Author: Alex','Author: Alex'],['Author: Alex','Author: Casey']]) assert.ok(extractField(page(1,lines),author).issue);
  const result=extractField(page(1,['Author: Alex','Author: Casey']),author,'Verified Name');
  assert.equal(result.value,'Verified Name');assert.equal(result.manual,true);assert.equal(result.candidates.length,2);assert.equal(result.issue,undefined);
  assert.ok(extractField(page(),author,'  ').issue);
});
test('region extraction rejects multiple or clipped lines', () => {
  const rule={...preset().fields[1],mode:'region' as const,prefix:'',region:{x:0,y:0,width:1,height:1}};
  assert.match(extractField(page(),rule).issue!,/Ambiguous/);
  const p=page(1,['Zoë García']);
  assert.equal(extractField(p,rule).value,'Zoë García');
  assert.match(extractField(p,{...rule,region:{x:.2,y:0,width:.7,height:.2}}).issue!,/clips/);
});
test('one page mode partitions source order exactly once', async () => {
  const pages=[page(1),page(2),page(3)], p=preset();p.filenameTemplate='{index}_{author}';
  const result=await analyzeBatch(info(3),pages,p);
  assert.equal(result.blockingCount,0);assertPartition(result.outputs.map(o=>o.pages),3);
  assert.deepEqual(result.outputs.map(o=>o.pages),[[1],[2],[3]]);
  assert.throws(()=>assertPartition([[1,2],[2,3]],3),/coverage/);
  assert.throws(()=>assertPartition([[1],[3]],3),/coverage/);
  assert.throws(()=>assertPartition([[2],[1],[3]],3),/coverage/);
});
test('marker grouping is exact-line and region scoped, never value-change inference', async () => {
  const p=preset();p.grouping.mode='marker';
  const pages=[page(1),page(2,['continuation','Mentions REPORT START in body']),page(3,['REPORT START','Date: 2026','Author: New Person','Type: Review'])];
  pages[1].lines.push({text:'REPORT START',box:{x:.1,y:.75,width:.3,height:.02}});
  const result=groupPages(pages,p);
  assert.deepEqual(result.groups,[[1,2],[3]]);assert.deepEqual(result.issues,[]);
  const analyzed=await analyzeBatch(info(3),pages,p);
  assertPartition(analyzed.outputs.map(o=>o.pages),3);
  assert.equal(analyzed.outputs[0].fields.author.value,'Zoë García');
});
test('orphan pages, no markers and multiple marker lines block the entire batch', async () => {
  const p=preset();p.grouping.mode='marker';
  for(const pages of [[page(1,['body only']),page(2)], [page(1,['body only'])], [page(1,['REPORT START','REPORT START'])]]) {
    const result=await analyzeBatch(info(pages.length),pages,p);assert.ok(result.blockingCount>0);assert.ok(result.issues.length>0);
  }
});
test('duplicate names are blocked without silent suffixing', async () => {
  const p=preset();
  const result=await analyzeBatch(info(2),[page(1),page(2)],p);
  assert.equal(result.outputs[0].filename,result.outputs[1].filename);
  assert.ok(result.outputs.every(o=>o.issues.some(i=>i.includes('Duplicate'))));
  const resolved=await analyzeBatch(info(2),[page(1),page(2)],{...p,filenameTemplate:'{index}_{date}_{author}_{type}'});
  assert.equal(resolved.blockingCount,0);
});
test('case, canonical Unicode, compatibility Unicode and truncation aliases collide', async () => {
  assert.equal(collisionKey('Résumé.pdf'),collisionKey('Re\u0301sume\u0301.PDF'));
  assert.equal(collisionKey('Ａlex.pdf'),collisionKey('alex.pdf'));
  assert.equal(collisionKey('STRASSE.pdf'),collisionKey('Straße.pdf'));
  const p=preset();p.filenameTemplate='{author}';
  const result=await analyzeBatch(info(2),[page(1),page(2)],p,{p1:{author:'Alex'},p2:{author:'ALEX'}});
  assert.ok(result.outputs.every(o=>o.issues.some(i=>i.includes('Duplicate'))));
  const long=await analyzeBatch(info(2),[page(1),page(2)],p,{p1:{author:'A'.repeat(200)+'x'},p2:{author:'A'.repeat(200)+'y'}});
  assert.ok(long.outputs.every(o=>o.issues.some(i=>i.includes('Duplicate'))));
});
test('filename safety covers traversal, reserved names, bidi, controls and UTF-8 length', () => {
  for(const input of ['../../etc/passwd','..\\..\\secret','CON','con.txt','LPT9','COM¹','a\u202eb\u0000c','..','', 'é'.repeat(200),'😀'.repeat(80)]) {
    const {filename}=sanitizeFilename(input);
    assert.ok(!/[\\/\p{Cc}\p{Cf}]/u.test(filename));
    assert.ok(new TextEncoder().encode(filename).byteLength<=180);
    assert.ok(!/^[ .]/.test(filename));
    assert.ok(!/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(filename.normalize('NFKC')));
    assert.ok(!filename.includes('\ufffd'));
  }
  assert.equal(sanitizeFilename('Re\u0301sume\u0301').filename,'Résumé.pdf');
});
test('preset allowlist, bounds and schema reject unsupported or content-bearing input', () => {
  assert.deepEqual(parsePreset(serializePreset(preset())),preset());
  const bad: unknown[]=[{...preset(),schemaVersion:2},{...preset(),documentText:'do not persist'}, {...preset(),filenameTemplate:'../{date}'}, {...preset(),filenameTemplate:'{unknown}'}, {...preset(),filenameTemplate:'{date'}, {...preset(),fields:[{...preset().fields[0],key:'constructor'}]}, {...preset(),fields:[{...preset().fields[0],region:{x:NaN,y:0,width:.5,height:.5}}]}, {...preset(),fields:[{...preset().fields[0],region:{x:.9,y:0,width:.5,height:.5}}]}];
  for(const value of bad)assert.throws(()=>validatePreset(value));
  assert.throws(()=>parsePreset('{broken'));
  assert.throws(()=>parsePreset(' '.repeat(MAX_PRESET_BYTES+1)),/64 KiB/);
});
test('source hash, rule edits and manual corrections invalidate the analysis ID', async () => {
  const pages=[page()],p=preset(),d=info(1);
  const a=await analyzeBatch(d,pages,p);
  assert.equal(a.id,(await analyzeBatch(d,pages,p)).id);
  for(const b of [await analyzeBatch({...d,sha256:'changed'},pages,p),await analyzeBatch(d,pages,{...p,filenameTemplate:'{index}_{author}'}),await analyzeBatch(d,pages,p,{p1:{author:'Verified'}})])assert.notEqual(a.id,b.id);
});

test('marker reconstruction excludes outside columns and blocks clipping', async () => {
  const p=preset();p.grouping.mode='marker';p.grouping.region={x:.04,y:.02,width:.6,height:.08};
  const pages=[page(1),page(2,['Continuation']),page(3)];
  pages[2].tokens.push({text:'003',box:{x:.8,y:.05,width:.1,height:.02},bx:480,by:45,dx:1,dy:0,advance:60,fontSize:12});
  pages[2].lines=buildLines(pages[2].tokens);
  assert.match(pages[2].lines[0].text,/REPORT START.*003/);
  assert.deepEqual(groupPages(pages,p),{groups:[[1,2],[3]],issues:[]});
  p.grouping.region.width=.4;
  const result=await analyzeBatch(info(3),pages,p);
  assert.ok(result.blockingCount>0);assert.ok(result.issues.some(issue=>issue.includes('clips text')));
});
test('filename truncation cannot reveal reserved devices and case-fold keys remain normalized', () => {
  for(const device of ['CON','PRN','AUX','NUL','COM1','LPT9','ＣＯＮ','COM¹']) {
    const {filename}=sanitizeFilename(device+' '+'. '.repeat(100)+'x');
    assert.ok(filename.startsWith('_'));assert.ok(new TextEncoder().encode(filename).byteLength<=180);
    assert.ok(!/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(filename.normalize('NFKC')));
  }
  assert.equal(new TextEncoder().encode(sanitizeFilename('CON.'+'x'.repeat(200)).filename).byteLength,180);
  assert.equal(collisionKey('ǰ.pdf'),collisionKey('J\u030c.pdf'));
  assert.equal(collisionKey('ΐ.pdf'),collisionKey('Ι\u0308\u0301.pdf'));
});

test('field regions block intersecting suffix tokens whose centers are outside', () => {
  const p=page(1,['Author: Alex']);
  p.tokens[0].box={x:.1,y:.1,width:.11,height:.02};
  p.tokens.push({...p.tokens[0],text:'Smith',box:{x:.48,y:.1,width:.06,height:.02},bx:288});
  const rule={...preset().fields[1],region:{x:.05,y:.05,width:.45,height:.2}};
  for(const mode of ['prefix','region'] as const){
    const r={...rule,mode};
    assert.match(extractField(p,r).issue!,/clips/);
    assert.equal(extractField(p,r).value,'');
    assert.equal(extractField(p,r,'Alex Smith').value,'Alex Smith');
    assert.equal(extractField(p,r,'Alex Smith').issue,undefined);
  }
  p.tokens[1].box.x=.51; // Truly separate outside text is irrelevant.
  assert.equal(extractField(p,rule).value,'Alex');
  p.tokens[1].box={x:.49,y:.1,width:.011,height:.02}; // Preserve .002 tolerance.
  assert.equal(extractField(p,rule).issue,undefined);
});
