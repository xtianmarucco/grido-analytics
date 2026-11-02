import type { Express } from 'express';

import { createApp } from './http/app.js';

/**
 * Vercel Function entry. Vercel's Express preset picks up `src/index.ts` (it must import
 * `express`) and runs the default export as a single function: no `listen`, and no static
 * serving (`express.static` is ignored on Vercel; the CDN serves the web build copied into
 * `public/`). Local `pnpm start` uses `server.ts`, which listens and serves the web build itself.
 */
const app: Express = createApp();

export default app;
