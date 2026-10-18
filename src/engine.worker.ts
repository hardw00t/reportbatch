import { getDocument, PDFWorker } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { loadDocument, exportBundle } from './core/pdf';
import { analyzeBatch } from './core/plan';
import type { LoadedDocument, Overrides, Preset, Progress } from './core/types';

let source: LoadedDocument | undefined;
let running = false;
self.onmessage = async (event: MessageEvent<{ id: number; type: string; payload: { bytes?: ArrayBuffer; name?: string; assetBase?: string; preset?: Preset; overrides?: Overrides; analysisId?: string } }>) => {
  const { id, type, payload } = event.data;
  if (running) { self.postMessage({ id, error: 'Another operation is running. Wait or cancel it first.' }); return; }
  running = true;
  const progress = (value: Progress) => self.postMessage({ id, progress: value });
  try {
    if (type === 'load') {
      source = undefined;
      const base = payload.assetBase!;
      // An explicit PDFWorker port avoids Window-only worker discovery in PDF.js.
      // Text-only extraction does not create DOM canvases or load FontFace objects.
      const port = new Worker(pdfWorker, { type: 'module', name: 'reportbatch-text-parser' });
      const parser = PDFWorker.create({ port });
      try {
        source = await loadDocument(new Uint8Array(payload.bytes!), payload.name!, async data => {
          const task = getDocument({ data, worker: parser, disableFontFace: true, useWorkerFetch: true, enableXfa: false, stopAtErrors: true, useSystemFonts: false, cMapUrl: base+'cmaps/', cMapPacked: true, standardFontDataUrl: base+'standard_fonts/', wasmUrl: base+'wasm/', iccUrl: base+'iccs/', maxImageSize: 16_000_000, canvasMaxAreaInBytes: 32_000_000, verbosity: 0 });
          task.onPassword = () => { void task.destroy(); };
          return task.promise;
        }, progress);
      } finally { parser.destroy(); port.terminate(); }
      self.postMessage({ id, result: source.info });
    } else {
      if (!source) throw new Error('Reload the source PDF before continuing.');
      if (type === 'analyze') self.postMessage({ id, result: await analyzeBatch(source.info, source.pages, payload.preset!, payload.overrides) });
      else if (type === 'export') {
        const result = await exportBundle(source, payload.preset!, payload.overrides ?? {}, payload.analysisId!, progress);
        const buffer = Uint8Array.from(result.bytes).buffer;
        self.postMessage({ id, result: { bytes: buffer, manifest: result.manifest } }, { transfer: [buffer] });
      } else throw new Error('Unsupported operation.');
    }
  } catch (error) { self.postMessage({ id, error: (error as Error).message || 'The operation could not be completed safely.' }); }
  finally { running = false; }
};
