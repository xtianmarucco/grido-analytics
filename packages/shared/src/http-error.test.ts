import { describe, expect, it } from 'vitest';

import {
  ErrorCode,
  errorResponseSchema,
  fileTooLargeMessage,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MEGABYTES,
} from './http-error.js';

describe('upload limit', () => {
  it('is 4 MB, below the 4.5 MB Vercel request body limit', () => {
    expect(MAX_UPLOAD_MEGABYTES).toBe(4);
    expect(MAX_UPLOAD_BYTES).toBe(4 * 1024 * 1024);
  });

  it('has one Spanish "too large" message for the API and the web client', () => {
    expect(fileTooLargeMessage()).toBe('El archivo supera el tamaño máximo de 4 MB.');
  });
});

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
