import { ErrorCode, errorResponseSchema, healthResponseSchema } from '@grido/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from './index.js';

describe('Vercel function entry (src/index.ts)', () => {
  it('default-exports an Express app that answers /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body).status).toBe('ok');
  });

  it('does not serve the web app itself: the Vercel CDN serves it from public/', async () => {
    const response = await request(app).get('/').set('Accept', 'text/html');

    expect(response.status).toBe(404);
    expect(errorResponseSchema.parse(response.body).error.code).toBe(ErrorCode.NotFound);
  });
});
