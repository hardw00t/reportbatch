import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { makeFixture, makeUnsupported, SAMPLE_REPORTS } from './fixture-lib';

await mkdir('public/samples',{recursive:true});
await mkdir('tests/fixtures',{recursive:true});
const sample=await makeFixture();
await writeFile('public/samples/reportbatch-sample.pdf',sample);
await writeFile('public/samples/grouped-reports.pdf',await makeFixture(SAMPLE_REPORTS.slice(0,3).map((r,i)=>({...r,pages:[2,1,3][i]}))));
await writeFile('tests/fixtures/issues.pdf',await makeFixture([{...SAMPLE_REPORTS[0],duplicateAuthor:true},SAMPLE_REPORTS[0],{...SAMPLE_REPORTS[2],missingType:true}]));
await writeFile('tests/fixtures/rotated-cropped.pdf',await makeFixture([SAMPLE_REPORTS[0]],{rotate:90,crop:true}));
await writeFile('tests/fixtures/mixed-sizes.pdf',await makeFixture(SAMPLE_REPORTS,{mixed:true}));
for(const kind of ['form','attachment','action','annotation','signature','layer','scan'] as const)await writeFile(`tests/fixtures/${kind}.pdf`,await makeUnsupported(kind));
await writeFile('tests/fixtures/corrupt.pdf','%PDF-1.7\nThis synthetic file is deliberately corrupt.\n%%EOF\n');
try {
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  const font = await readFile('tests/fixtures/fonts/NotoSans-Regular.ttf');
  await writeFile('tests/fixtures/unicode.pdf',await makeFixture([{date:'03/04/2026',author:'Zoë García — Αλεξάνδρα',type:'Résumé'}],{font,fontkit}));
} catch { console.warn('Optional Unicode fixture regeneration needs @pdf-lib/fontkit and the checked-in OFL font.'); }
console.log('Synthetic sample and rejection fixtures generated. No customer data used.');
