import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
const packages=[];
let notices='ReportBatch — third-party notices\n\nPinned package metadata is also recorded in docs/DEPENDENCIES.json.\nNative optional modules used by Node test tooling are not shipped in the browser bundle.\n\n';
for(const [path,entry] of Object.entries(lock.packages)) {
  if(!path)continue;
  try {
    const pkg=JSON.parse(await readFile(join(path,'package.json'),'utf8'));
    const row={name:pkg.name,version:pkg.version,license:pkg.license??entry.license??'UNKNOWN',development:!!entry.dev,optional:!!entry.optional};
    packages.push(row);
    if(entry.dev)continue;
    notices+=`\n===== ${pkg.name} ${pkg.version} (${row.license}) =====\n`;
    const names=await readdir(path);
    const licenses=names.filter(name=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(name));
    if(!licenses.length)notices+='See package source for full license text.\n';
    for(const name of licenses)notices+=`\n${name}\n${await readFile(join(path,name),'utf8')}\n`;
  } catch (error) { if(!entry.optional)throw error; }
}
packages.sort((a,b)=>a.name.localeCompare(b.name));
if(packages.some(p=>p.license==='UNKNOWN'))throw new Error('A dependency has an unknown license; review it before release.');
await mkdir('docs',{recursive:true});
await writeFile('docs/DEPENDENCIES.json',JSON.stringify({generatedFrom:'package-lock.json',packages},null,2)+'\n');
await writeFile('public/THIRD_PARTY_NOTICES.txt',notices);
console.log(`Recorded ${packages.length} installed packages and production license texts. Asset directories retain their upstream font/CMap/codec licenses.`);
