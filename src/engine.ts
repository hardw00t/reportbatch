import { abortError } from './core/pdf';
import type { Progress } from './core/types';

export class EngineClient {
  private worker?: Worker;
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; progress: (value: Progress) => void }>();
  loaded = false;
  async request<T>(type: string, payload: Record<string, unknown>, progress: (value: Progress) => void = () => {}): Promise<T> {
    if (!this.worker) {
      this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module', name: 'reportbatch-engine' });
      this.worker.onmessage = event => {
        const message = event.data, job = this.pending.get(message.id);
        if (!job) return;
        if (message.progress) { job.progress(message.progress); return; }
        this.pending.delete(message.id);
        if (message.error) job.reject(new Error(message.error)); else job.resolve(message.result);
      };
      this.worker.onerror = () => this.fail(new Error('The PDF worker stopped unexpectedly. Cancel and reload the original; nothing incomplete will be downloaded.'));
    }
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, progress });
      this.worker!.postMessage({ id, type, payload });
    });
  }
  private fail(error: Error) {
    for (const job of this.pending.values()) job.reject(error);
    this.pending.clear(); this.worker?.terminate(); this.worker = undefined; this.loaded = false;
  }
  cancel() { this.fail(abortError()); }
}
