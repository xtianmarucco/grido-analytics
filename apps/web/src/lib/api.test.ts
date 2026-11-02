import { describe, expect, it, vi } from 'vitest';

import { ApiError, ClientErrorCode, fetchHealth, uploadAnalysis } from './api';

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

const analysis = {
  import: {
    period: { from: '2026-10-19', to: '2026-10-25' },
    branches: [{ code: 1, name: 'Almirante', shiftCount: 0 }],
    shifts: [],
    warnings: [],
    summary: { totalRows: 0, includedRows: 0, excludedRows: 0 },
  },
  views: [],
};

describe('uploadAnalysis', () => {
  it('posts the file as multipart field "file" and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(analysis));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['x'], 'turnos.xlsx');

    await expect(uploadAnalysis(file)).resolves.toEqual(analysis);

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/analysis');
    expect(init.method).toBe('POST');
    expect((init.body as FormData).get('file')).toBe(file);
  });

  it('surfaces the API code, Spanish message and details of a rejection', async () => {
    const envelope = {
      error: {
        code: 'MISSING_COLUMNS',
        message: 'Faltan columnas obligatorias: sv_aceptada.',
        details: { missing: ['sv_aceptada'] },
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(envelope, 422)));

    await expect(uploadAnalysis(new File(['x'], 'turnos.xlsx'))).rejects.toMatchObject({
      code: 'MISSING_COLUMNS',
      message: 'Faltan columnas obligatorias: sv_aceptada.',
      status: 422,
      details: { missing: ['sv_aceptada'] },
    });
  });
});
