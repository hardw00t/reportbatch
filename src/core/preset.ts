import type { FieldRule, Preset, Region } from './types';

export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_PAGES = 500;
export const MAX_EXPORT_BYTES = 200 * 1024 * 1024;
export const MAX_PRESET_BYTES = 64 * 1024;
export const DEFAULT_PRESET: Preset = {
  schemaVersion: 1,
  name: 'Report headers',
  fields: [
    { key: 'date', label: 'Date', mode: 'prefix', prefix: 'Date:', region: { x: 0.04, y: 0.04, width: 0.92, height: 0.36 } },
    { key: 'author', label: 'Author', mode: 'prefix', prefix: 'Author:', region: { x: 0.04, y: 0.04, width: 0.92, height: 0.36 } },
    { key: 'type', label: 'Report type', mode: 'prefix', prefix: 'Type:', region: { x: 0.04, y: 0.04, width: 0.92, height: 0.36 } },
  ],
  grouping: { mode: 'page', marker: 'REPORT START', region: { x: 0.04, y: 0.02, width: 0.92, height: 0.15 } },
  filenameTemplate: '{date}_{author}_{type}',
};

function record(value: unknown, what: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${what} must be an object.`);
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], what: string) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`${what} has unsupported properties. Presets may contain rules only.`);
}
function string(value: unknown, max: number, what: string, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()) || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new Error(`${what} must be plain text of ${empty ? '0' : '1'}–${max} characters.`);
  return value.normalize('NFC');
}
export function validateRegion(value: unknown): Region {
  const r = record(value, 'Region');
  keys(r, ['x', 'y', 'width', 'height'], 'Region');
  for (const key of ['x', 'y', 'width', 'height']) if (typeof r[key] !== 'number' || !Number.isFinite(r[key])) throw new Error('Region coordinates must be finite numbers.');
  const box = r as unknown as Region;
  if (box.x < 0 || box.y < 0 || box.width < 0.005 || box.height < 0.005 || box.x + box.width > 1.000001 || box.y + box.height > 1.000001) throw new Error('Regions must fit inside the visible page and be at least 0.5% wide and high.');
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}
export function validatePreset(value: unknown): Preset {
  const p = record(value, 'Preset');
  keys(p, ['schemaVersion', 'name', 'fields', 'grouping', 'filenameTemplate'], 'Preset');
  if (p.schemaVersion !== 1) throw new Error('Unsupported preset version. This release reads schemaVersion 1.');
  if (!Array.isArray(p.fields) || p.fields.length < 1 || p.fields.length > 8) throw new Error('A preset needs 1–8 required fields.');
  const seen = new Set<string>();
  const fields = p.fields.map(value => {
    const f = record(value, 'Field');
    keys(f, ['key', 'label', 'mode', 'prefix', 'region'], 'Field');
    const key = string(f.key, 24, 'Field key');
    if (!/^[a-z][a-z0-9_]*$/.test(key) || ['index', 'page', 'constructor', 'prototype', '__proto__'].includes(key) || seen.has(key)) throw new Error('Field keys must be unique, lowercase names; reserved keys cannot be used.');
    seen.add(key);
    if (f.mode !== 'prefix' && f.mode !== 'region') throw new Error('Choose a prefix or region rule.');
    return { key, label: string(f.label, 40, 'Field label'), mode: f.mode as FieldRule['mode'], prefix: string(f.prefix, 120, 'Prefix', f.mode === 'region'), region: validateRegion(f.region) };
  });
  const g = record(p.grouping, 'Grouping');
  keys(g, ['mode', 'marker', 'region'], 'Grouping');
  if (g.mode !== 'page' && g.mode !== 'marker') throw new Error('Choose one page per report or an exact start marker.');
  const filenameTemplate = string(p.filenameTemplate, 200, 'Filename template');
  const tokens = [...filenameTemplate.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]);
  if (tokens.some(token => !seen.has(token) && !['index', 'page'].includes(token)) || /[{}]/.test(filenameTemplate.replace(/\{[^{}]+\}/g, ''))) throw new Error('The filename template contains an unknown or incomplete {field}.');
  if (/[\\/]/.test(filenameTemplate)) throw new Error('Use a filename template, without folders or path separators.');
  return {
    schemaVersion: 1,
    name: string(p.name, 80, 'Preset name'),
    fields,
    grouping: { mode: g.mode, marker: string(g.marker, 120, 'Start marker', g.mode === 'page'), region: validateRegion(g.region) },
    filenameTemplate,
  };
}
export function parsePreset(text: string): Preset {
  if (new TextEncoder().encode(text).byteLength > MAX_PRESET_BYTES) throw new Error('Preset exceeds 64 KiB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not valid preset JSON.'); }
  return validatePreset(value);
}
export function serializePreset(preset: Preset): string { return JSON.stringify(validatePreset(preset), null, 2) + '\n'; }
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function fingerprint(value: unknown): Promise<string> { return sha256(new TextEncoder().encode(JSON.stringify(value))); }
