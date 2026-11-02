import { describe, expect, it } from 'vitest';

import { healthResponseSchema } from './health.js';

describe('healthResponseSchema', () => {
  it('accepts a healthy response', () => {
    const body = {
      status: 'ok',
      service: 'grido-analytics-api',
      timestamp: '2026-11-02T12:00:00.000Z',
    };

    expect(healthResponseSchema.parse(body)).toEqual(body);
  });

  it('rejects an unknown status', () => {
    const result = healthResponseSchema.safeParse({
      status: 'down',
      service: 'grido-analytics-api',
      timestamp: '2026-11-02T12:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a timestamp that is not ISO 8601', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      service: 'grido-analytics-api',
      timestamp: 'yesterday',
    });

    expect(result.success).toBe(false);
  });
});
