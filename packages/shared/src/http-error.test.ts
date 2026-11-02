import { describe, expect, it } from 'vitest';

import { ErrorCode, errorResponseSchema } from './http-error.js';

describe('errorResponseSchema', () => {
  it('accepts the error envelope with details', () => {
    const body = {
      error: { code: ErrorCode.NotFound, message: 'Route not found', details: { path: '/api/x' } },
    };

    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('accepts the error envelope without details', () => {
    const body = { error: { code: ErrorCode.InternalError, message: 'Unexpected error' } };

    expect(errorResponseSchema.safeParse(body).success).toBe(true);
  });

  it('rejects an envelope with an empty code or missing message', () => {
    expect(errorResponseSchema.safeParse({ error: { code: '', message: 'x' } }).success).toBe(
      false,
    );
    expect(errorResponseSchema.safeParse({ error: { code: 'NOT_FOUND' } }).success).toBe(false);
  });

  it('rejects a body that is not wrapped in "error"', () => {
    expect(errorResponseSchema.safeParse({ code: 'NOT_FOUND', message: 'x' }).success).toBe(false);
  });
});
