import type { FieldResult, FieldRule, PageText, Region, TextLine, Token } from './types';

export const normalizeText = (text: string) => text.normalize('NFC').replace(/\s+/gu, ' ').trim();
export function inside(box: Region, region: Region): boolean {
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  return x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height;
}
function contains(box: Region, r: Region): boolean {
  const epsilon = 0.002;
  return box.x >= r.x - epsilon && box.y >= r.y - epsilon && box.x + box.width <= r.x + r.width + epsilon && box.y + box.height <= r.y + r.height + epsilon;
}
function union(tokens: Token[]): Region {
  const x = Math.min(...tokens.map(t => t.box.x)), y = Math.min(...tokens.map(t => t.box.y));
  return { x, y, width: Math.max(...tokens.map(t => t.box.x + t.box.width)) - x, height: Math.max(...tokens.map(t => t.box.y + t.box.height)) - y };
}
export function buildLines(tokens: Token[]): TextLine[] {
  const groups: Token[][] = [];
  for (const token of tokens.filter(t => t.text.trim())) {
    const group = groups.find(g => {
      const a = g[0];
      const parallel = a.dx * token.dx + a.dy * token.dy > 0.999;
      const perpendicularDistance = Math.abs((token.bx - a.bx) * -a.dy + (token.by - a.by) * a.dx);
      return parallel && perpendicularDistance <= Math.max(1, Math.min(a.fontSize, token.fontSize) * 0.3);
    });
    if (group) group.push(token); else groups.push([token]);
  }
  return groups.map(group => {
    const axis = group[0];
    group.sort((a, b) => (a.bx - b.bx) * axis.dx + (a.by - b.by) * axis.dy);
    let text = '';
    for (let i = 0; i < group.length; i++) {
      const item = group[i], prev = group[i - 1];
      const gap = prev ? (item.bx - prev.bx) * axis.dx + (item.by - prev.by) * axis.dy - prev.advance : 0;
      text += (prev && gap > Math.min(prev.fontSize, item.fontSize) * 0.12 ? ' ' : '') + item.text;
    }
    return { text: normalizeText(text), box: union(group) };
  }).filter(line => line.text).sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}
export function extractField(page: PageText, rule: FieldRule, manualValue?: string): FieldResult {
  const selected = page.tokens.filter(token => inside(token.box, rule.region));
  const lines = buildLines(selected);
  const prefix = normalizeText(rule.prefix);
  const candidates = rule.mode === 'prefix'
    ? lines.filter(line => line.text.startsWith(prefix)).map(line => line.text.slice(prefix.length).trim())
    : lines.map(line => prefix && line.text.startsWith(prefix) ? line.text.slice(prefix.length).trim() : line.text);
  let issue: string | undefined;
  if (!candidates.length || (candidates.length === 1 && !candidates[0])) issue = 'Missing value';
  else if (candidates.length > 1) issue = `Ambiguous: ${candidates.length} matching lines`;
  else if (selected.some(token => !contains(token.box, rule.region))) issue = 'Region clips text; expand it or enter a verified value';
  const manual = manualValue !== undefined;
  const value = manual ? normalizeText(manualValue) : (issue ? '' : candidates[0]);
  if (manual) issue = value ? undefined : 'A verified value is required';
  if (value.length > 240) issue = 'Value exceeds 240 characters';
  return { value, candidates, manual, sourcePage: page.number, ...(issue ? { issue } : {}) };
}
