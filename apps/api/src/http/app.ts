import express, { type Express } from 'express';

import { createErrorHandler, notFoundHandler } from './errors.js';
import { createHealthRouter } from './health-router.js';

/** Builds the Express app without listening, so tests can drive it with supertest. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use('/api/health', createHealthRouter());

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
}
