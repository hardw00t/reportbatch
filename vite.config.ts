import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'development-only-hmr-csp',
    apply: 'serve',
    transformIndexHtml: html => html.replace("connect-src 'self';", "connect-src 'self' ws://127.0.0.1:5173;"),
  }],
  base: './',
  worker: { format: 'es' },
  server: { host: '127.0.0.1', strictPort: true, port: 5173 },
  preview: { host: '127.0.0.1', strictPort: true, port: 4173 },
  build: { target: 'es2022' },
});
