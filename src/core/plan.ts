import { fingerprint, validatePreset } from './preset';
import { buildLines, contains, extractField, inside, normalizeText } from './text';
import type { Analysis, DocumentInfo, Overrides, PageText, Preset } from './types';

const forbidden = /[<>:"/\\|?*\p{Cc}\p{Cf}]/gu;
const encoder = new TextEncoder();
export function sanitizeFilename(value: string): { filename: string; changed: boolean } {
  const normalized = value.normalize('NFC');
  let base = normalized.replace(/\.pdf$/i, '').replace(forbidden, '_').replace(/\s+/gu, ' ').replace(/^[ .]+|[ .]+$/g, '');
  if (!base || base === '.' || base === '..') base = 'unnamed';
  while (encoder.encode(base + '.pdf').byteLength > 180) base = Array.from(base).slice(0, -1).join('');
  base = base.replace(/[ .]+$/g, '') || 'unnamed';
  // Truncation and its final trim can reveal a reserved device name.
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(base.normalize('NFKC'))) {
    base = '_' + base;
    while (encoder.encode(base + '.pdf').byteLength > 180) base = Array.from(base).slice(0, -1).join('');
    base = base.replace(/[ .]+$/g, '');
  }
  const filename = base + '.pdf';
  return { filename, changed: filename !== normalized + (normalized.toLowerCase().endsWith('.pdf') ? '' : '.pdf') };
}
// NFKC plus case folding catches compatibility and common Windows/macOS aliases.
export function collisionKey(filename: string): string { return filename.normalize('NFKC').toLocaleLowerCase('und').replace(/ß/g, 'ss').replace(/ς/g, 'σ').normalize('NFKC'); }
export function assertPartition(groups: number[][], count: number): void {
  const flattened = groups.flat();
  if (flattened.length !== count || flattened.some((page, index) => page !== index + 1)) throw new Error('Page coverage failed: every source page must appear exactly once, in source order.');
}
export function groupPages(pages: PageText[], preset: Preset): { groups: number[][]; issues: string[] } {
  if (preset.grouping.mode === 'page') return { groups: pages.map(page => [page.number]), issues: [] };
  const marker = normalizeText(preset.grouping.marker);
  const starts: number[] = [], issues: string[] = [];
  for (const page of pages) {
    const region = preset.grouping.region;
    // Restrict tokens first, so outside columns cannot conceal a report boundary.
    const selected = page.tokens.filter(token => inside(token.box, region));
    const clipped = page.tokens.some(({ box }) =>
      box.x < region.x + region.width && box.x + box.width > region.x &&
      box.y < region.y + region.height && box.y + box.height > region.y && !contains(box, region));
    if (clipped) issues.push(`Page ${page.number}: marker region clips text. Expand or reposition it before exporting.`);
    const matches = buildLines(selected).filter(line => line.text === marker);
    if (matches.length > 1) issues.push(`Page ${page.number}: multiple start markers inside the marker region.`);
    if (matches.length) starts.push(page.number);
  }
  if (!starts.length) return { groups: [], issues: ['No exact start markers found. Check the marker text and region. No pages can be exported.'] };
  if (starts[0] !== 1) issues.push(`Pages 1–${starts[0] - 1} precede the first start marker. No pages can be exported until this is resolved.`);
  const groups = starts.map((start, index) => Array.from({ length: (starts[index + 1] ?? pages.length + 1) - start }, (_, offset) => start + offset));
  return { groups, issues };
}
export async function analyzeBatch(document: DocumentInfo, pages: PageText[], value: Preset, overrides: Overrides = {}): Promise<Analysis> {
  const preset = validatePreset(value);
  if (!pages.length || document.pageCount !== pages.length || pages.some((page, i) => page.number !== i + 1)) throw new Error('Document page inventory is inconsistent. Reload the original.');
  const grouped = groupPages(pages, preset);
  const issues = [...grouped.issues];
  try { assertPartition(grouped.groups, pages.length); } catch (error) { issues.push((error as Error).message); }
  const outputs = grouped.groups.map((group, offset) => {
    const id = `p${group[0]}`;
    const fields = Object.fromEntries(preset.fields.map(rule => [rule.key, extractField(pages[group[0] - 1], rule, Object.hasOwn(overrides[id] ?? {}, rule.key) ? overrides[id][rule.key] : undefined)]));
    const outputIssues = preset.fields.filter(rule => fields[rule.key].issue).map(rule => `${rule.label}: ${fields[rule.key].issue}`);
    const rawName = preset.filenameTemplate.replace(/\{([^{}]+)\}/g, (_, token: string) => token === 'index' ? String(offset + 1).padStart(3, '0') : token === 'page' ? String(group[0]).padStart(3, '0') : fields[token]?.value ?? '');
    const safe = sanitizeFilename(rawName);
    const notices = safe.changed ? ['Unsafe filename characters were replaced or the name was shortened. Review the final name.'] : [];
    if (!rawName.trim() || safe.filename === 'unnamed.pdf') outputIssues.push('Filename is empty after sanitization.');
    return { id, index: offset + 1, pages: group, fields, filename: safe.filename, issues: outputIssues, notices };
  });
  const names = new Map<string, typeof outputs>();
  for (const output of outputs) {
    const key = collisionKey(output.filename), existing = names.get(key) ?? [];
    existing.push(output); names.set(key, existing);
  }
  for (const collision of names.values()) if (collision.length > 1) for (const output of collision) output.issues.push('Duplicate filename. Verify the fields or deliberately add {index} to the template.');
  // The hash binds review to source bytes, every rule, and every manual correction.
  const id = await fingerprint({ document: document.sha256, preset, overrides });
  return { id, document, preset, outputs, issues, blockingCount: issues.length + outputs.filter(o => o.issues.length > 0).length, pageCount: pages.length };
}
