import { ErrorCode, errorResponseSchema, healthResponseSchema } from '@grido/shared';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import { createErrorHandler, HttpError, notFoundHandler } from './errors.js';

describe('GET /api/health', () => {
  it('responds 200 with a valid health body', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(healthResponseSchema.parse(response.body).status).toBe('ok');
  });

  it('does not advertise Express', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('unknown API routes', () => {
  it('respond 404 with the NOT_FOUND error envelope', async () => {
    const response = await request(createApp()).get('/api/nope');

    expect(response.status).toBe(404);
    const body = errorResponseSchema.parse(response.body);
    expect(body.error.code).toBe(ErrorCode.NotFound);
    expect(body.error.details).toEqual({ method: 'GET', path: '/api/nope' });
  });
});

/** Minimal app wired with the real handlers and routes that fail on purpose. */
function appWithFailingRoutes(log: (error: unknown) => void) {
  const app = express();
  app.get('/boom', () => {
    throw new Error('database password is hunter2');
  });
  app.get('/async-boom', async () => {
    await Promise.resolve();
    throw new Error('async failure');
  });
  app.get('/teapot', () => {
    throw new HttpError(418, 'TEAPOT', 'I am a teapot', { brew: 'coffee' });
  });
  app.use(notFoundHandler);
  app.use(createErrorHandler(log));
  return app;
}

describe('error handler', () => {
  it('turns unexpected errors into a generic 500 without leaking internals', async () => {
    const log = vi.fn();
    const response = await request(appWithFailingRoutes(log)).get('/boom');

    expect(response.status).toBe(500);
    expect(errorResponseSchema.parse(response.body).error.code).toBe(ErrorCode.InternalError);
    expect(response.text).not.toContain('hunter2');
    expect(response.text).not.toMatch(/at .*\.ts/);
    expect(log).toHaveBeenCalledOnce();
  });

  it('also catches rejected async handlers', async () => {
    const response = await request(appWithFailingRoutes(vi.fn())).get('/async-boom');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe(ErrorCode.InternalError);
  });

  it('maps HttpError to its status, code, message and details', async () => {
    const response = await request(appWithFailingRoutes(vi.fn())).get('/teapot');

    expect(response.status).toBe(418);
    expect(response.body).toEqual({
      error: { code: 'TEAPOT', message: 'I am a teapot', details: { brew: 'coffee' } },
    });
  });
});
