import { cpSync, mkdirSync, existsSync } from 'node:fs';
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  const source = new URL(`../node_modules/pdfjs-dist/${folder}`, import.meta.url);
  if (existsSync(source)) {
    const destination = new URL(`../public/vendor/pdfjs/${folder}`, import.meta.url);
    mkdirSync(destination, { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
}
