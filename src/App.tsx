import { useCallback, useEffect, useRef, useState } from 'react';
import { EngineClient } from './engine';
import { PdfPreview, assetBase } from './PdfPreview';
import { DEFAULT_PRESET, MAX_FILE_BYTES, MAX_PRESET_BYTES, parsePreset, serializePreset, validatePreset } from './core/preset';
import { extractField } from './core/text';
import { sanitizeFilename } from './core/plan';
import type { Analysis, DocumentInfo, Manifest, Overrides, PageText, Preset, Progress, Region } from './core/types';

const PRESET_STORAGE = 'reportbatch.presets.v1';
const cloneDefault = () => structuredClone(DEFAULT_PRESET);
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6m-6 4h6"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>,
    download: <><path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
    region: <><path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/><rect x="8" y="8" width="8" height="8"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.file}</svg>;
}
function download(bytes: BlobPart, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const pageRange = (pages: number[]) => pages.length === 1 ? `${pages[0]}` : `${pages[0]}–${pages.at(-1)}`;
const humanBytes = (bytes: number) => bytes < 1024*1024 ? `${Math.ceil(bytes/1024)} KiB` : `${(bytes/(1024*1024)).toFixed(1)} MiB`;

export function App() {
  const engine = useRef(new EngineClient());
  const operation = useRef(0);
  const operationActive = useRef(false);
  const sampleRequest = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null), presetInput = useRef<HTMLInputElement>(null), reviewHeading = useRef<HTMLHeadingElement>(null);
  const [source, setSource] = useState<{ bytes: Uint8Array; name: string } | null>(null);
  const [info, setInfo] = useState<DocumentInfo | null>(null);
  const [preset, setPreset] = useState<Preset>(cloneDefault);
  const [saved, setSaved] = useState<Preset[]>([]);
  const [page, setPage] = useState(1), [selectedField, setSelectedField] = useState('date');
  const [tab, setTab] = useState<'fields' | 'split' | 'names'>('fields');
  const [drawing, setDrawing] = useState(false), [previewText, setPreviewText] = useState<PageText | null>(null), [previewError, setPreviewError] = useState('');
  const [busy, setBusy] = useState<'load' | 'analyze' | 'export' | null>(null), [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null), [dirty, setDirty] = useState(false), [approved, setApproved] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>({}), [selectedOutput, setSelectedOutput] = useState('p1');
  const [onlyIssues, setOnlyIssues] = useState(false), [reviewPage, setReviewPage] = useState(0);
  const [lastExport, setLastExport] = useState<{ outputs: number; pages: number; size: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESET_STORAGE);
      if (stored) {
        const value: unknown = JSON.parse(stored);
        if (!Array.isArray(value) || value.length > 20 || stored.length > 20*MAX_PRESET_BYTES) throw new Error('Invalid saved layouts');
        setSaved(value.map(validatePreset));
      }
    } catch { setNotice('Saved layouts could not be read. Import a preset file or save a fresh layout.'); }
    return () => { sampleRequest.current?.abort(); engine.current.cancel(); };
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawing(false); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);
  const onText = useCallback((value: PageText | null) => setPreviewText(value), []);
  const onRenderError = useCallback((value: string) => { setPreviewError(value); if (value) setApproved(false); }, []);
  const field = preset.fields.find(rule => rule.key === selectedField) ?? preset.fields[0];
  const activeRegion = tab === 'split' ? preset.grouping.region : field.region;
  const selected = analysis?.outputs.find(output => output.id === selectedOutput);
  const filtered = analysis?.outputs.filter(output => !onlyIssues || output.issues.length || output.notices.length) ?? [];
  const reviewRows = filtered.slice(reviewPage*50, reviewPage*50+50);
  const canExport = !!analysis && !dirty && analysis.blockingCount === 0 && approved && !busy && !previewError;

  function changePreset(next: Preset) {
    setPreset(next); setDirty(true); setApproved(false); setOverrides({}); setLastExport(null); setDrawing(false); setNotice('');
  }
  function updateField(patch: Partial<Preset['fields'][number]>) { changePreset({ ...preset, fields: preset.fields.map(rule => rule.key === field.key ? { ...rule, ...patch } : rule) }); }
  function updateRegion(region: Region) {
    if (tab === 'split') changePreset({ ...preset, grouping: { ...preset.grouping, region } }); else updateField({ region });
  }
  function stop() {
    sampleRequest.current?.abort(); sampleRequest.current = null;
    operation.current++; operationActive.current = false; engine.current.cancel(); setBusy(null); setProgress(null); setApproved(false); setDirty(true); setLastExport(null);
    setNotice('Cancelled. No incomplete download was created. You can run preflight again.');
  }
  function reset() {
    sampleRequest.current?.abort(); sampleRequest.current = null;
    operation.current++; operationActive.current = false; engine.current.cancel(); setSource(null); setInfo(null); setAnalysis(null); setOverrides({}); setApproved(false); setDirty(false); setBusy(null); setProgress(null); setError(''); setNotice('Document cleared from the workbench. Saved layout rules remain on this device.'); setLastExport(null); setPreviewText(null); setPreviewError(''); setPage(1);
  }
  async function loadFile(file: File) {
    if (busy || operationActive.current) return;
    if (file.size > MAX_FILE_BYTES) { setError('This file exceeds the 30 MiB limit. Split it into smaller source batches first.'); return; }
    const token = ++operation.current; operationActive.current = true; engine.current.cancel();
    setBusy('load'); setError(''); setNotice(''); setAnalysis(null); setOverrides({}); setApproved(false); setDirty(false); setLastExport(null); setSource(null); setInfo(null); setPreviewError(''); setPage(1); setProgress({ phase: 'Opening local file', done: 0, total: 1 });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (token !== operation.current) return;
      const info = await engine.current.request<DocumentInfo>('load', { bytes: bytes.buffer, name: file.name, assetBase: assetBase() }, value => { if (token === operation.current) setProgress(value); });
      if (token !== operation.current) return;
      engine.current.loaded = true; setSource({ bytes, name: file.name }); setInfo(info); setNotice(`${info.pageCount} searchable pages checked. Define your layout, then run full-batch preflight.`);
    } catch (error) { if (token === operation.current && (error as Error).name !== 'AbortError') { setError((error as Error).message); engine.current.cancel(); } }
    finally { if (token === operation.current) { operationActive.current = false; setBusy(null); setProgress(null); } }
  }
  async function sample() {
    if (busy || operationActive.current) return;
    const token = ++operation.current;
    const controller = new AbortController(); sampleRequest.current = controller;
    operationActive.current = true; setBusy('load');
    setProgress({ phase: 'Opening synthetic sample', done: 0, total: 1 });
    try {
      setError('');
      const response = await fetch(`${import.meta.env.BASE_URL}samples/reportbatch-sample.pdf`, { signal: controller.signal });
      if (!response.ok) throw new Error('The synthetic sample could not be loaded. Use a local PDF instead.');
      const bytes = await response.arrayBuffer();
      if (token !== operation.current) return;
      changePreset(cloneDefault());
      operationActive.current = false; setBusy(null); sampleRequest.current = null;
      await loadFile(new File([bytes], 'reportbatch-sample.pdf', { type: 'application/pdf' }));
    } catch (error) { if (token === operation.current && (error as Error).name !== 'AbortError') setError((error as Error).message); }
    finally { if (token === operation.current) { operationActive.current = false; setBusy(null); setProgress(null); sampleRequest.current = null; } }
  }
  async function preflight() {
    if (!source || busy || operationActive.current) return;
    operationActive.current = true;
    const token = ++operation.current;
    setBusy('analyze'); setError(''); setNotice(''); setApproved(false); setLastExport(null); setProgress({ phase: 'Checking every proposed output', done: 0, total: info!.pageCount });
    try {
      const validated = validatePreset(preset);
      if (!engine.current.loaded) {
        await engine.current.request('load', { bytes: source.bytes.buffer, name: source.name, assetBase: assetBase() }, value => { if (token === operation.current) setProgress(value); });
        if (token !== operation.current) return;
        engine.current.loaded = true;
      }
      const result = await engine.current.request<Analysis>('analyze', { preset: validated, overrides });
      if (token !== operation.current) return;
      setAnalysis(result); setDirty(false); setReviewPage(0); setOnlyIssues(false); setSelectedOutput(result.outputs[0]?.id ?? 'p1');
      window.setTimeout(() => reviewHeading.current?.focus(), 0);
    } catch (error) { if (token === operation.current && (error as Error).name !== 'AbortError') setError((error as Error).message); }
    finally { if (token === operation.current) { operationActive.current = false; setBusy(null); setProgress(null); } }
  }
  async function exportFiles() {
    if (!canExport || !analysis || operationActive.current) return;
    operationActive.current = true;
    const token = ++operation.current;
    setBusy('export'); setError(''); setNotice(''); setLastExport(null); setProgress({ phase: 'Starting verified export', done: 0, total: analysis.outputs.length });
    try {
      const result = await engine.current.request<{ bytes: ArrayBuffer; manifest: Manifest }>('export', { preset, overrides, analysisId: analysis.id }, value => { if (token === operation.current) setProgress(value); });
      if (token !== operation.current) return;
      download(result.bytes, 'reportbatch-export.zip', 'application/zip');
      setLastExport({ outputs: result.manifest.outputs.length, pages: result.manifest.verification.totalOutputPages, size: result.bytes.byteLength });
      setNotice('Verified archive handed to your browser. Check its Downloads list for the saved file.');
    } catch (error) { if (token === operation.current && (error as Error).name !== 'AbortError') { setError((error as Error).message); setApproved(false); } }
    finally { if (token === operation.current) { operationActive.current = false; setBusy(null); setProgress(null); } }
  }
  function savePreset() {
    try {
      const validated = validatePreset(preset);
      const next = [...saved.filter(p => p.name !== validated.name), validated];
      if (next.length > 20) throw new Error('You can save up to 20 presets. Export one or clear saved layouts before adding another.');
      localStorage.setItem(PRESET_STORAGE, JSON.stringify(next)); setSaved(next); setNotice('Layout rules saved on this device. No PDF, extracted values or manual corrections were saved.'); setError('');
    } catch (error) { setError((error as Error).message || 'This browser could not save the layout. Export a preset file instead.'); }
  }
  async function importPreset(file: File) {
    if (busy || operationActive.current) return;
    const token = ++operation.current; operationActive.current = true; setBusy('load');
    setProgress({ phase: 'Reading layout preset', done: 0, total: 1 });
    try {
      if (file.size > MAX_PRESET_BYTES) throw new Error('Preset exceeds 64 KiB.');
      const text = await file.text();
      if (token !== operation.current) return;
      const next = parsePreset(text); changePreset(next); setSelectedField(next.fields[0].key); setNotice(`Imported “${next.name}”. Run preflight before export.`); setError('');
    } catch (error) { if (token === operation.current) setError((error as Error).message); }
    finally { if (token === operation.current) { operationActive.current = false; setBusy(null); setProgress(null); } }
  }
  function exportPreset() {
    try { download(serializePreset(preset), sanitizeFilename(preset.name).filename.replace(/\.pdf$/, '.reportbatch.json'), 'application/json'); setError(''); }
    catch (error) { setError((error as Error).message); }
  }
  function correct(key: string, value: string) {
    if (!selected) return;
    setOverrides({ ...overrides, [selected.id]: { ...overrides[selected.id], [key]: value } }); setDirty(true); setApproved(false); setLastExport(null);
  }

  return <>
    <a className="skip-link" href="#main">Skip to workbench</a>
    <header className="site-header"><a href="#" className="brand"><span className="brand-mark"><Icon name="file" size={23}/></span>ReportBatch{' '}<span className="edition">LOCAL EDITION</span></a><div className="header-right"><span className="privacy-pill"><span className="live-dot"/>Documents stay on your device</span><a href="#guide" className="text-link">Quick guide <span aria-hidden="true">↗</span></a></div></header>
    <main id="main">
      <div className="workspace-heading"><div><p className="eyebrow">THE REPORT WORKBENCH</p><h1>{info ? 'Give every report a clear name.' : <>One batch in.<br/>Every report accounted for.</>}</h1><p className="lead">Split searchable PDFs, name them from their contents,<br className="desktop-break"/> and leave with a complete page trail.</p></div><span className="local-note"><Icon name="lock" size={18}/>No uploads. No account. No telemetry.</span></div>
      <ol className="steps" aria-label="Workflow"><li className={!info ? 'active' : 'done'}><span>{info ? '✓' : '01'}</span>Load a batch</li><li className={info && !analysis ? 'active' : analysis ? 'done' : ''}><span>02</span>Define the layout</li><li className={analysis ? 'active' : ''}><span>03</span>Review every output</li><li className={lastExport ? 'done' : ''}><span>04</span>Export with a trail</li></ol>
      {error && <div className="alert alert-error" role="alert"><strong>We couldn’t complete that.</strong><span>{error}</span><button type="button" className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><Icon name="close"/></button></div>}
      {notice && <div className="notice" role="status">{notice}</div>}
      {busy && <div className="operation" role="status" aria-live="polite"><span className="spinner"/><div><strong>{progress?.phase ?? 'Working locally'}</strong><span>{progress && progress.total > 1 ? `${progress.done} of ${progress.total}` : 'Your original file stays unchanged.'}</span></div><button type="button" className="button secondary small" onClick={stop}>Cancel operation</button></div>}
      <input className="sr-only" type="file" accept="application/pdf,.pdf" ref={fileInput} aria-label="Choose PDF batch" disabled={!!busy} onChange={event => { const f = event.target.files?.[0]; event.target.value = ''; if (f) void loadFile(f); }}/>
      <input className="sr-only" type="file" accept="application/json,.json" ref={presetInput} aria-label="Import layout preset" disabled={!!busy} onChange={event => { const f = event.target.files?.[0]; event.target.value = ''; if (f) void importPreset(f); }}/>
      {!source && !busy && <section className="start-grid" aria-label="Start a batch">
        <div className={`upload-card ${dragOver ? 'drag-over' : ''}`} onDragOver={event => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={event => { event.preventDefault(); setDragOver(false); if (event.dataTransfer.files.length !== 1) setError('Choose one source PDF at a time.'); else void loadFile(event.dataTransfer.files[0]); }}>
          <span className="upload-icon"><Icon name="upload" size={28}/></span><h2>Your reports, in good order.</h2><p>Drop a searchable PDF here.<br/>We’ll check every page before you export.</p><button className="button primary" type="button" onClick={() => fileInput.current?.click()}>Choose a PDF <Icon name="arrow" size={18}/></button><p className="fineprint">1–500 searchable pages · up to 30 MiB<br/>Scans need OCR first. Originals stay untouched.</p>
        </div>
        <div className="sample-card"><div className="sample-top"><span className="tag">TAKE A 60-SECOND TOUR</span><span className="sample-count">4 reports / 4 pages</span></div><div className="paper-stack" aria-hidden="true"><div className="stack-sheet back"/><div className="stack-sheet mid"/><div className="stack-sheet front"><span className="mini-brand">NORTHLINE / FIELD OPERATIONS</span><strong>Weekly site report</strong><div className="mini-fields"><span>Date: <b>2026-10-12</b></span><span>Author: <b>Alex Morgan</b></span><span>Type: <b>Site visit</b></span></div><i/><i/><i/><span className="mini-stamp">SYNTHETIC SAMPLE</span></div><div className="filename-floating"><Icon name="check" size={15}/><code>2026-10-12_Alex Morgan_Site visit.pdf</code></div></div><div className="sample-bottom"><div><h2>See a good first export.</h2><p>Try a fictional batch with a ready-made layout.</p></div><button className="button secondary" type="button" onClick={() => void sample()}>Try the sample <Icon name="arrow" size={17}/></button></div></div>
      </section>}
      {source && info && <>
        <div className="source-bar"><span className="file-symbol"><Icon name="file"/></span><div className="source-name"><strong title={info.name}>{info.name}</strong><span>{info.pageCount} searchable pages · {humanBytes(info.byteLength)} · original preserved</span></div><button type="button" className="button quiet small" disabled={!!busy} onClick={() => fileInput.current?.click()}>Change PDF</button><button type="button" className="icon-button" disabled={!!busy} onClick={reset} aria-label="Clear document from memory"><Icon name="close"/></button></div>
        <div className="work-grid" aria-busy={!!busy}>
          <section className="preview-panel" aria-label="Document preview"><div className="panel-toolbar"><div><span className="section-kicker">SOURCE PREVIEW</span><span className="page-dimensions">{previewText ? `${Math.round(previewText.width)} × ${Math.round(previewText.height)} pt · ${previewText.rotation}°` : 'Reading page…'}</span></div><div className="page-nav"><button type="button" aria-label="Previous source page" disabled={page <= 1 || !!busy} onClick={() => setPage(page-1)}>←</button><label><span className="sr-only">Source page</span><input type="number" min={1} max={info.pageCount} value={page} disabled={!!busy} onChange={event => setPage(Math.min(info.pageCount, Math.max(1, Number(event.target.value) || 1)))}/><span>/ {info.pageCount}</span></label><button type="button" aria-label="Next source page" disabled={page >= info.pageCount || !!busy} onClick={() => setPage(page+1)}>→</button></div></div>
            <PdfPreview bytes={source.bytes} page={page} region={activeRegion} regionLabel={tab === 'split' ? 'Start-marker region' : field.label} drawing={drawing && !busy} onRegion={updateRegion} onText={onText} onRenderError={onRenderError}/>
            <details className="extracted-text"><summary>Extracted text on this page</summary><p>Text alternative for the preview. Extraction order can differ from reading order.</p><pre>{previewText?.lines.map(line => line.text).join('\n') ?? 'Reading searchable text…'}</pre></details>
          </section>
          <section className="config-panel" aria-label="Layout and naming rules"><div className="config-title"><div><span className="section-kicker">LAYOUT RULES</span><h2>Make the pattern yours.</h2></div><span className="tag subtle">ALL FIELDS REQUIRED</span></div>
            <div className="config-nav" aria-label="Rule sections">{(['fields','split','names'] as const).map((value, index) => <button type="button" key={value} aria-pressed={tab === value} disabled={!!busy} onClick={() => { setTab(value); setDrawing(false); }}><span aria-hidden="true">0{index+1}</span>{value === 'fields' ? 'Fields' : value === 'split' ? 'Split' : 'Names'}</button>)}</div>
            <fieldset disabled={!!busy} className="config-body"><legend className="sr-only">{tab} rules</legend>
              {tab === 'fields' && <><p className="help-text">Read required fields from the <strong>first page of each report</strong>. Values stay literal; dates are never guessed or reformatted.</p><div className="field-picker" aria-label="Choose a field">{preset.fields.map(rule => <button type="button" key={rule.key} aria-pressed={field.key === rule.key} onClick={() => { setSelectedField(rule.key); setDrawing(false); }}>{rule.label}</button>)}</div><label>Extraction method<select value={field.mode} onChange={event => updateField({ mode: event.target.value as 'prefix' | 'region' })}><option value="prefix">Line beginning with a label</option><option value="region">Single line inside a region</option></select></label><label>{field.mode === 'prefix' ? 'Exact line prefix' : 'Optional prefix to remove'}<input value={field.prefix} maxLength={120} onChange={event => updateField({ prefix: event.target.value })}/></label><p className="help-text">{field.mode === 'prefix' ? 'Match is case-sensitive and limited to the highlighted region. Multiple matching lines block export.' : 'The box must contain one complete line. Multiple lines or clipped text need review.'}</p></>}
              {tab === 'split' && <><label>Report boundaries<select value={preset.grouping.mode} onChange={event => changePreset({ ...preset, grouping: { ...preset.grouping, mode: event.target.value as 'page' | 'marker' } })}><option value="page">One source page per report</option><option value="marker">Exact start-marker line</option></select></label>{preset.grouping.mode === 'marker' ? <><label>Start marker<input value={preset.grouping.marker} maxLength={120} onChange={event => changePreset({ ...preset, grouping: { ...preset.grouping, marker: event.target.value } })}/></label><p className="help-text">A whole, case-sensitive line in the highlighted region starts a report. Continuation pages stay with it. Page 1 must match. This does not group by a changing field value.</p><div className="inline-warning">Use a marker that appears only on report starts. A repeated header is not a reliable boundary. Review every proposed page range.</div></> : <div className="inline-info">Each page becomes a separate report. Every source page must appear exactly once in the export.</div>}</>}
              {tab === 'names' && <><label>Filename template<input className="mono" value={preset.filenameTemplate} maxLength={200} onChange={event => changePreset({ ...preset, filenameTemplate: event.target.value })}/></label><div className="template-tokens">{[...preset.fields.map(f => f.key),'index','page'].map(key => <button type="button" key={key} onClick={() => changePreset({ ...preset, filenameTemplate: preset.filenameTemplate+`{${key}}` })}>{`{${key}}`}</button>)}</div><p className="help-text">The .pdf extension is added automatically. {'{index}'} is the padded report number; {'{page}'} is its first source page.</p><div className="inline-info">Unsafe characters are replaced. Names over 180 UTF-8 bytes are shortened. Duplicate names block export; no automatic suffixes are added.</div><div className="example-name"><span>EXAMPLE</span><code>{sanitizeFilename(preset.filenameTemplate.replace(/\{date\}/g,'2026-10-12').replace(/\{author\}/g,'Alex Morgan').replace(/\{type\}/g,'Site visit').replace(/\{index\}|\{page\}/g,'001')).filename}</code></div></>}
              {(tab === 'fields' || (tab === 'split' && preset.grouping.mode === 'marker')) && <div className="region-controls"><div className="label-row"><strong>{tab === 'split' ? 'Marker region' : 'Search region'}</strong><button className={`button quiet small ${drawing ? 'draw-active' : ''}`} type="button" aria-pressed={drawing} onClick={() => setDrawing(!drawing)}><Icon name="region" size={16}/>{drawing ? 'Cancel drawing' : 'Draw on page'}</button></div><div className="coordinate-grid">{(['x','y','width','height'] as const).map(key => <label key={key}>{key === 'x' ? 'Left %' : key === 'y' ? 'Top %' : key === 'width' ? 'Width %' : 'Height %'}<input type="number" min={key === 'x' || key === 'y' ? 0 : .5} max={100} step="0.1" value={Math.round(activeRegion[key]*1000)/10} onChange={event => updateRegion({ ...activeRegion, [key]: Number(event.target.value)/100 })}/></label>)}</div><p className="help-text">Percentages of the visible, rotated page. Use numeric controls as a keyboard alternative to drawing.</p></div>}
              {tab === 'fields' && previewText && <div className="detected"><span>ON SOURCE PAGE {page}</span>{(() => { const result = extractField(previewText, field); return <><strong className={result.issue ? 'error-text' : ''}>{result.issue ?? result.value}</strong>{result.candidates.length > 1 && <small>{result.candidates.join(' · ')}</small>}</>; })()}</div>}
            </fieldset>
            <div className="preset-tools"><label>Layout name<input value={preset.name} maxLength={80} disabled={!!busy} onChange={event => changePreset({ ...preset, name: event.target.value })}/></label><div className="preset-actions"><button type="button" className="button secondary small" disabled={!!busy} onClick={savePreset}>Save on this device</button><button type="button" className="button quiet small" disabled={!!busy} onClick={exportPreset}>Export preset</button><button type="button" className="button quiet small" disabled={!!busy} onClick={() => presetInput.current?.click()}>Import</button></div>{saved.length > 0 && <label>Saved layouts<select aria-label="Saved layout preset" disabled={!!busy} value="" onChange={event => { const p = saved[Number(event.target.value)]; if (p) { changePreset(structuredClone(p)); setSelectedField(p.fields[0].key); } }}><option value="">Load a saved layout…</option>{saved.map((p,i) => <option key={p.name} value={i}>{p.name}</option>)}</select></label>}<p className="fineprint">Presets store rules, never source pages or extracted values.</p></div>
            <div className="preflight-action"><button type="button" className="button primary full" disabled={!!busy} onClick={() => void preflight()}>{analysis ? 'Run preflight again' : 'Run full-batch preflight'}<Icon name="arrow" size={18}/></button><span>Check all {info.pageCount} pages before naming any output.</span></div>
          </section>
        </div>
        {analysis && <section className="review-section" aria-labelledby="review-title"><div className="review-header"><div><p className="eyebrow">FULL-BATCH PREFLIGHT</p><h2 id="review-title" ref={reviewHeading} tabIndex={-1}>A clear view of every output.</h2><p>{dirty ? 'The rules or corrections changed. Run preflight again to verify this batch.' : `${analysis.outputs.length} proposed reports · ${analysis.outputs.reduce((sum,o) => sum+o.pages.length,0)} of ${analysis.pageCount} source pages assigned`}</p></div><span className={`status-badge ${dirty || analysis.blockingCount ? 'blocked' : 'ready'}`}>{dirty ? 'Needs recheck' : analysis.blockingCount ? `${analysis.blockingCount} blocked` : 'Page coverage checked'}</span></div>
          {analysis.issues.length > 0 && <div className="alert alert-error" role="alert"><strong>Batch export is blocked.</strong><ul>{analysis.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
          <div className="review-layout"><div className="output-list"><div className="list-toolbar"><strong>Proposed filenames</strong><label className="checkbox-label"><input type="checkbox" checked={onlyIssues} onChange={event => { setOnlyIssues(event.target.checked); setReviewPage(0); }}/>Only issues & notices</label></div><div className="table-scroll"><table><thead><tr><th scope="col">Report</th><th scope="col">Source pages</th><th scope="col">Filename</th><th scope="col">Check</th></tr></thead><tbody>{reviewRows.map(output => <tr key={output.id} className={output.id === selectedOutput ? 'selected-row' : ''}><th scope="row"><button type="button" disabled={!!busy} onClick={() => { setSelectedOutput(output.id); setPage(output.pages[0]); }}>Review {String(output.index).padStart(3,'0')}</button></th><td>{pageRange(output.pages)}</td><td><code>{output.filename}</code></td><td><span className={`row-status ${dirty ? 'stale' : output.issues.length ? 'blocked' : output.notices.length ? 'caution' : 'ready'}`}>{dirty ? 'Recheck' : output.issues.length ? 'Blocked' : output.notices.length ? 'Review' : 'Ready'}</span></td></tr>)}</tbody></table>{!reviewRows.length && <p className="empty-list">{analysis.outputs.length ? 'No outputs match this filter.' : 'No outputs can be proposed with these boundaries.'}</p>}</div><div className="pagination"><span>{filtered.length ? `${reviewPage*50+1}–${Math.min(filtered.length,(reviewPage+1)*50)} of ${filtered.length}` : '0 outputs'}</span><button type="button" className="button quiet small" disabled={reviewPage === 0} onClick={() => setReviewPage(reviewPage-1)}>Previous 50</button><button type="button" className="button quiet small" disabled={(reviewPage+1)*50 >= filtered.length} onClick={() => setReviewPage(reviewPage+1)}>Next 50</button></div></div>
            <aside className="output-inspector" aria-label="Selected output corrections">{selected ? <><span className="section-kicker">REPORT {String(selected.index).padStart(3,'0')} · PAGES {pageRange(selected.pages)}</span><h3>Verify the identifying fields.</h3><p className="help-text">Compare with the source preview. A manual correction replaces extraction for this output only; recheck after editing.</p><fieldset disabled={!!busy}><legend className="sr-only">Verified field corrections</legend>{preset.fields.map(rule => { const result = selected.fields[rule.key]; return <label key={rule.key}>{rule.label}<input aria-label={`Verified ${rule.label}`} value={overrides[selected.id]?.[rule.key] ?? result?.value ?? ''} maxLength={240} onChange={event => correct(rule.key,event.target.value)}/><small>{dirty && Object.hasOwn(overrides[selected.id] ?? {},rule.key) ? 'Manual value · pending recheck' : result?.manual ? 'Manual correction recorded' : result?.issue ?? 'Extracted from first source page'}</small>{!!result?.candidates.length && <span className="candidate-text">Found: {result.candidates.join(' | ')}</span>}</label>; })}</fieldset>{[...selected.issues,...selected.notices].map(issue => <p className="inspector-issue" key={issue}>{issue}</p>)}{dirty && <button type="button" className="button secondary full" disabled={!!busy} onClick={() => void preflight()}>Recheck corrections</button>}</> : <p>No output is selected.</p>}</aside>
          </div>
          <div className="export-panel"><div className="export-copy"><span className="export-icon"><Icon name="download" size={25}/></span><div><h3>Your reports. The complete trail.</h3><p>The ZIP includes named PDFs and a JSON manifest with source pages,<br className="desktop-break"/> field evidence, corrections and checksums.</p></div></div><div className="export-controls"><label className="checkbox-label review-approval"><input type="checkbox" checked={approved} disabled={!!busy || dirty || analysis.blockingCount > 0 || !!previewError} onChange={event => setApproved(event.target.checked)}/>I reviewed every filename, page range and notice.</label><button type="button" className="button primary" disabled={!canExport} onClick={() => void exportFiles()}><Icon name="download" size={18}/>{busy === 'export' ? 'Verifying export…' : 'Export verified ZIP'}</button>{(!canExport && !busy) && <span className="fineprint">{dirty ? 'Run preflight again to enable export.' : analysis.blockingCount ? 'Resolve all blocked outputs before export.' : previewError ? previewError : 'Confirm your review to enable export.'}</span>}</div></div>
          {lastExport && <div className="export-success" role="status"><Icon name="check"/><div><strong>{lastExport.outputs} PDFs verified · {lastExport.pages} pages accounted for · {humanBytes(lastExport.size)}</strong><p>Every archived PDF was reopened and checked against the manifest. The archive was handed to your browser; confirm the save in Downloads.</p></div></div>}
        </section>}
      </>}
      <section id="guide" className="guide-section" aria-label="Quick guide and limitations"><div className="guide-intro"><p className="eyebrow">A REPEATABLE ROUTINE</p><h2>Set it once.<br/>Review it every time.</h2><p>For searchable, fixed-layout reports.<br/>No guessing what belongs where.</p></div><div className="guide-items"><details><summary>01 · Get a good first export</summary><p>Try the synthetic sample, then run full-batch preflight. Review each filename and source page range, confirm the review, and export. Open the ZIP to find four PDFs and manifest.json.</p></details><details><summary>02 · Teach the layout your fields</summary><p>Choose the date, author or report type. Set the exact label prefix and search region, or draw a box around one complete value line. Numeric region controls work with a keyboard. Imported presets can define up to eight required fields. Values are literal text, including date formats.</p></details><details><summary>03 · Keep every page in its report</summary><p>Use one page per report, or a whole-line start marker that appears only on report starts. Marker matches must be in the selected region, including page 1. This is not value-change grouping. Body mentions outside the marker region do not start reports. A repeated header can still match an exact marker; inspect every boundary.</p></details><details><summary>04 · Understand the boundaries</summary><p>Maximum 500 pages, 30 MiB source, 2 million extracted characters, 6,000 text items per page, and 200 MiB generated PDFs. These are safety limits, not a promise that every PDF within them will work. Scans, blank pages, encrypted or malformed PDFs, vertical text, forms, signatures, annotations, attachments, layers, portfolios and actions are unsupported. Export a flat searchable copy first. Bookmarks and document metadata do not carry over.</p></details><details><summary>Privacy, recovery & saved layouts</summary><p>PDF content is processed in memory on this device. There is no upload, telemetry or account. Clearing the document or closing this tab releases the workbench’s references; browser memory reclamation is not secure erasure. Only layouts you explicitly save use local storage. Preset files contain rules, not source pages or corrections. The downloaded manifest contains field values and source filenames; protect it like the reports. Cancellation creates no partial download. Re-run preflight to retry; reload the original if the worker stops. Your source file is never written.</p><button type="button" className="button secondary small" disabled={!!busy} onClick={() => { try { localStorage.removeItem(PRESET_STORAGE); setSaved([]); setNotice('All saved layout presets removed from this device.'); } catch { setError('Saved layouts could not be cleared in this browser. Use browser site-data controls.'); } }}>Clear saved layouts</button></details></div></section>
      <footer><a href="#" className="footer-brand">ReportBatch<span>Local edition · v0.1.0</span></a><p>Good names. Whole reports. Nothing left behind.</p><span className="footer-local"><Icon name="lock" size={14}/>Built for your device</span></footer>
    </main>
  </>;
}
