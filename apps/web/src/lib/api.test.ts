import { describe, expect, it, vi } from 'vitest';

import { ApiError, ClientErrorCode, fetchHealth } from './api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchHealth', () => {
  it('returns the parsed health body', async () => {
    const health = {
      status: 'ok',
      service: 'grido-analytics-api',
      timestamp: '2026-11-02T12:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(health)));

    await expect(fetchHealth()).resolves.toEqual(health);
  });

  it('throws NETWORK_ERROR when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchHealth()).rejects.toMatchObject({ code: ClientErrorCode.NetworkError });
  });

  it('throws NETWORK_ERROR for a non-JSON 5xx (dev proxy with the API down)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })));

    await expect(fetchHealth()).rejects.toMatchObject({
      code: ClientErrorCode.NetworkError,
      status: 502,
    });
  });

  it('surfaces the API error envelope code', async () => {
    const envelope = { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(envelope, 500)));

    const error = await fetchHealth().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'INTERNAL_ERROR', status: 500 });
  });

  it('throws INVALID_RESPONSE when the body does not match the contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'maybe' })));

    await expect(fetchHealth()).rejects.toMatchObject({ code: ClientErrorCode.InvalidResponse });
  });
});
