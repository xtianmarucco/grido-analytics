import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiTarget = `http://127.0.0.1:${process.env.PORT ?? '3001'}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Mirrors the `paths` mapping in tsconfig.json.
    alias: {
      '@grido/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Same origin in dev: the browser calls /api on Vite, which forwards to Express. No CORS.
    proxy: {
      '/api': apiTarget,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
