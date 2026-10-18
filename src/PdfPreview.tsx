import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { extractPage } from './core/pdf';
import type { PageText, Region } from './core/types';

GlobalWorkerOptions.workerSrc = pdfWorker;
export const assetBase = () => new URL(`${import.meta.env.BASE_URL}vendor/pdfjs/`, location.href).href;
interface Props {
  bytes: Uint8Array;
  page: number;
  region: Region;
  regionLabel: string;
  drawing: boolean;
  onRegion: (region: Region) => void;
  onText: (text: PageText | null) => void;
  onRenderError: (message: string) => void;
}
export function PdfPreview({ bytes, page, region, regionLabel, drawing, onRegion, onText, onRenderError }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null), surface = useRef<HTMLDivElement>(null);
  const renderTask = useRef<RenderTask | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [ratio, setRatio] = useState('612 / 792');
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [draft, setDraft] = useState<Region | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let disposed = false;
    const base = assetBase();
    const task = getDocument({ data: bytes.slice(), enableXfa: false, stopAtErrors: true, useSystemFonts: true, cMapUrl: base+'cmaps/', cMapPacked: true, standardFontDataUrl: base+'standard_fonts/', wasmUrl: base+'wasm/', iccUrl: base+'iccs/', maxImageSize: 16_000_000, canvasMaxAreaInBytes: 32_000_000, verbosity: 0 });
    void task.promise.then(pdf => { if (!disposed) setDocument(pdf); }).catch(() => { if (!disposed) { setError('Preview could not open this PDF. Reload a clean searchable copy.'); onRenderError('Preview could not open this PDF.'); } });
    return () => { disposed = true; renderTask.current?.cancel(); void task.destroy(); };
  }, [bytes, onRenderError]);
  useEffect(() => {
    if (!document) return;
    let disposed = false;
    setLoading(true); setError(''); onText(null);
    const previous = renderTask.current; previous?.cancel();
    void (async () => {
      await previous?.promise.catch(() => {});
      const pdfPage = await document.getPage(page);
      if (disposed || !canvas.current) return;
      const original = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(1.5, 1000/original.width, 3500/original.height, Math.sqrt(2_000_000/(original.width*original.height)));
      const viewport = pdfPage.getViewport({ scale });
      setRatio(`${original.width} / ${original.height}`);
      canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
      const text = await extractPage(pdfPage);
      if (disposed) return;
      onText(text);
      const task = pdfPage.render({ canvas: canvas.current, viewport, background: '#ffffff' });
      renderTask.current = task;
      await task.promise;
      if (!disposed) { setLoading(false); onRenderError(''); }
    })().catch(error => {
      if (!disposed && error.name !== 'RenderingCancelledException') { setLoading(false); setError('This page could not be previewed safely. Reload or use a fresh PDF.'); onRenderError('Preview failed. Inspect a fresh source before exporting.'); }
    });
    return () => { disposed = true; renderTask.current?.cancel(); };
  }, [document, page, onText, onRenderError]);
  useEffect(() => { if (!drawing) { start.current = null; setDraft(null); } }, [drawing]);
  function point(event: React.PointerEvent) {
    const box = surface.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX-box.left)/box.width)), y: Math.max(0, Math.min(1, (event.clientY-box.top)/box.height)) };
  }
  const shown = draft ?? region;
  return <div className="preview-wrap">
    <div ref={surface} className={`preview-sheet ${drawing ? 'is-drawing' : ''}`} style={{ aspectRatio: ratio }}
      onPointerDown={event => { if (!drawing || loading) return; event.preventDefault(); start.current = point(event); event.currentTarget.setPointerCapture(event.pointerId); setDraft({ ...start.current, width: 0, height: 0 }); }}
      onPointerMove={event => { if (!start.current) return; const end = point(event); setDraft({ x: Math.min(start.current.x,end.x), y: Math.min(start.current.y,end.y), width: Math.abs(end.x-start.current.x), height: Math.abs(end.y-start.current.y) }); }}
      onPointerUp={event => { if (!start.current) return; const end = point(event), first = start.current; start.current = null; setDraft(null); const value = { x: Math.min(first.x,end.x), y: Math.min(first.y,end.y), width: Math.abs(end.x-first.x), height: Math.abs(end.y-first.y) }; if (value.width >= .005 && value.height >= .005) onRegion(value); }}
      onPointerCancel={() => { start.current = null; setDraft(null); }}>
      <canvas ref={canvas} aria-label={`PDF preview, source page ${page}. Use the extracted text below for a text alternative.`} role="img" />
      {!loading && !error && <div className="region-overlay" aria-hidden="true" style={{ left: `${shown.x*100}%`, top: `${shown.y*100}%`, width: `${shown.width*100}%`, height: `${shown.height*100}%` }}><span>{regionLabel}</span></div>}
      {loading && !error && <div className="canvas-loading" role="status">Rendering page {page}…</div>}
      {error && <div className="canvas-loading error-text" role="alert">{error}</div>}
    </div>
    {drawing && <p className="draw-instruction">Drag a box on the page. You can also enter its position in the layout controls. Press Escape to cancel.</p>}
  </div>;
}
