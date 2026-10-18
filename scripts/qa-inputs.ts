/** Synthetic browser-input corpus; no customer data or network activity. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { makeFixture, makeSizedFixture, SAMPLE_REPORTS } from './fixture-lib';
import { DEFAULT_PRESET, serializePreset, MAX_FILE_BYTES } from '../src/core/preset';
const dir = resolve(process.argv[2] ?? 'test-results/qa-inputs');
await mkdir(dir, { recursive: true });
for (const n of [500, 501]) {
  const reports = Array.from({ length: n }, (_, i) => ({ ...SAMPLE_REPORTS[0], author: `Synthetic Person ${String(i + 1).padStart(3, '0')}` }));
  await writeFile(`${dir}/${n}-synthetic-reports.pdf`, await makeFixture(reports));
}
await writeFile(`${dir}/30-MiB-synthetic.pdf`, await makeSizedFixture(MAX_FILE_BYTES));
await writeFile(`${dir}/30-MiB-plus-one.pdf`, new Uint8Array(MAX_FILE_BYTES + 1));
await writeFile(`${dir}/page-preset.json`, serializePreset(DEFAULT_PRESET));
await writeFile(`${dir}/marker-preset.json`, serializePreset({ ...DEFAULT_PRESET, name: 'Synthetic grouped reports', grouping: { ...DEFAULT_PRESET.grouping, mode: 'marker' } }));
await writeFile(`${dir}/extra-field-preset.json`, JSON.stringify({ ...DEFAULT_PRESET, customerData: 'REJECT_SYNTHETIC_ONLY' }));
await writeFile(`${dir}/oversized-preset.json`, ' '.repeat(65537));
console.log(`Eight synthetic inputs written to ${dir}`);
