import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Express } from 'express';

import { createApp } from './http/app.js';

/**
 * Vercel Function entry. Vercel's Express preset picks up `src/index.ts` (it must import
 * `express`) and runs the default export as a single function, without `listen`.
 *
 * The web build is served by this function, not by the Vercel CDN: with Root Directory
 * `apps/api`, Vercel collects `public/` before the build step creates it, so no static files are
 * deployed. `vercel-build` copies the web build into `apps/api/public` and `vercel.json`
 * bundles it into the function with `includeFiles`. Local `pnpm start` uses `server.ts`.
 */
export function createFunctionApp(publicDir: string): Express {
  const servesWeb = existsSync(path.join(publicDir, 'index.html'));
  return createApp({ webDistDir: servesWeb ? publicDir : undefined });
}

// Compiled to `apps/api/src/index.js`; the bundled web build sits at `apps/api/public`.
const defaultPublicDir = fileURLToPath(new URL('../public', import.meta.url));

const app: Express = createFunctionApp(defaultPublicDir);

export default app;
