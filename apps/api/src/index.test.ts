import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ErrorCode, errorResponseSchema, healthResponseSchema } from '@grido/shared';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app, { createFunctionApp } from './index.js';

describe('Vercel function entry (src/index.ts)', () => {
  let publicDir: string | undefined;

  afterEach(() => {
    if (publicDir) rmSync(publicDir, { recursive: true, force: true });
    publicDir = undefined;
  });

  function webBuild(): string {
    publicDir = mkdtempSync(path.join(tmpdir(), 'grido-public-'));
    writeFileSync(
      path.join(publicDir, 'index.html'),
      '<!doctype html><title>Grido Analytics</title>',
    );
    return publicDir;
  }

  it('default-exports an Express app that answers /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body).status).toBe('ok');
  });

  it('serves the bundled web build and its SPA fallback', async () => {
    const functionApp = createFunctionApp(webBuild());

    const home = await request(functionApp).get('/').set('Accept', 'text/html');
    const deepLink = await request(functionApp).get('/ranking').set('Accept', 'text/html');

    expect(home.status).toBe(200);
    expect(home.text).toContain('Grido Analytics');
    expect(deepLink.status).toBe(200);
    expect(deepLink.text).toContain('Grido Analytics');
  });

  it('keeps unknown API routes as JSON 404 even with the web build', async () => {
    const response = await request(createFunctionApp(webBuild()))
      .get('/api/nope')
      .set('Accept', 'text/html');

    expect(response.status).toBe(404);
    expect(errorResponseSchema.parse(response.body).error.code).toBe(ErrorCode.NotFound);
  });

  it('runs API-only when the web build is missing', async () => {
    const response = await request(createFunctionApp('/nonexistent/public'))
      .get('/')
      .set('Accept', 'text/html');

    expect(response.status).toBe(404);
  });
});
