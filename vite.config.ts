import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  worker: { format: 'es' },
  server: { host: '127.0.0.1', strictPort: true, port: 5173 },
  preview: { host: '127.0.0.1', strictPort: true, port: 4173 },
  build: { target: 'es2022' },
});
