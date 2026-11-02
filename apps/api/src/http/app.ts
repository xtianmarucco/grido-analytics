import express, { type Express } from 'express';

import { createErrorHandler, notFoundHandler } from './errors.js';
import { createHealthRouter } from './health-router.js';
import { createStaticWebRouter } from './static-web.js';

export interface AppOptions {
  /** Absolute path to the built web app. When set, the API also serves it (production). */
  webDistDir?: string | undefined;
}

/** Builds the Express app without listening, so tests can drive it with supertest. */
export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use('/api/health', createHealthRouter());
  // Unknown /api routes are always JSON 404s, never the SPA's index.html.
  app.use('/api', notFoundHandler);

  if (options.webDistDir) {
    app.use(createStaticWebRouter(options.webDistDir));
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
