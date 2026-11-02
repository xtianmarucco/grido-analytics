import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ErrorCode } from '@grido/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app.js';

let webDistDir: string;

beforeAll(() => {
  webDistDir = mkdtempSync(path.join(tmpdir(), 'grido-web-dist-'));
  writeFileSync(path.join(webDistDir, 'index.html'), '<title>Grido Analytics</title>');
  mkdirSync(path.join(webDistDir, 'assets'));
  writeFileSync(path.join(webDistDir, 'assets', 'app-abc123.js'), 'console.log(1);');
});

afterAll(() => {
  rmSync(webDistDir, { recursive: true, force: true });
});

describe('serving the web build', () => {
  it('serves index.html at the root', async () => {
    const response = await request(createApp({ webDistDir })).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Grido Analytics');
  });

  it('serves built assets with long-lived caching', async () => {
    const response = await request(createApp({ webDistDir })).get('/assets/app-abc123.js');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('falls back to index.html for client-side routes', async () => {
    const response = await request(createApp({ webDistDir }))
      .get('/some/client/route')
      .set('Accept', 'text/html');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Grido Analytics');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('keeps API routes working and unknown API routes as JSON 404', async () => {
    const app = createApp({ webDistDir });

    expect((await request(app).get('/api/health')).body.status).toBe('ok');
    const notFound = await request(app).get('/api/nope').set('Accept', 'text/html');
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe(ErrorCode.NotFound);
  });

  it('answers a missing asset with 404, not with index.html', async () => {
    const response = await request(createApp({ webDistDir })).get('/assets/missing.js');

    expect(response.status).toBe(404);
  });
});

describe('without a web build', () => {
  it('answers non-API routes with the JSON 404 envelope', async () => {
    const response = await request(createApp()).get('/');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe(ErrorCode.NotFound);
  });
});
