import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const port = Number(process.env.REPORTBATCH_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('REPORTBATCH_PORT must be 1024–65535.');
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.json':'application/json; charset=utf-8','.bcmap':'application/octet-stream','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.icc':'application/vnd.iccprofile' };
const csp = "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'";
await stat(resolve(root,'index.html')).catch(()=>{throw new Error('No production build found. Run npm run build first.');});
const server=createServer(async(request,response)=>{
  response.setHeader('Content-Security-Policy',csp);
  response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('Referrer-Policy','no-referrer');
  response.setHeader('X-Frame-Options','DENY');
  response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  response.setHeader('Cache-Control','no-store');
  const end=(status,body)=>{response.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});response.end(body);};
  if(!['GET','HEAD'].includes(request.method??'')){request.resume();return end(405,'Only static GET/HEAD requests are supported.');}
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(request.headers.host??''))return end(403,'Loopback host required.');
  let path;
  try {
    const pathname=decodeURIComponent(new URL(request.url??'/',`http://127.0.0.1:${port}`).pathname);
    if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(segment=>segment.startsWith('.')))return end(404,'Not found.');
    path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root+sep))return end(404,'Not found.');
  } catch {return end(400,'Invalid request path.');}
  try {
    const data=await readFile(path);
    response.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Content-Length':data.length});
    response.end(request.method==='HEAD'?undefined:data);
  } catch {end(404,'Not found.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`ReportBatch local: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
