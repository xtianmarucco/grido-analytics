import { describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  ClientErrorCode,
  downloadReport,
  fetchHealth,
  fileNameFromDisposition,
  isUserFacingError,
  uploadAnalysis,
} from './api';

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

/** What Vercel answers when the request body exceeds its 4.5 MB limit: not the API envelope. */
function platformTooLargeResponse(): Response {
  return new Response('Request Entity Too Large\n\nFUNCTION_PAYLOAD_TOO_LARGE\n', {
    status: 413,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

const TOO_LARGE = {
  code: 'FILE_TOO_LARGE',
  message: 'El archivo supera el tamaño máximo de 4 MB.',
  status: 413,
};

describe('platform 413 (Vercel FUNCTION_PAYLOAD_TOO_LARGE)', () => {
  it('maps a non-envelope 413 on upload to the Spanish "too large" error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(platformTooLargeResponse()));

    const error = await uploadAnalysis(new File(['x'], 'turnos.xlsx')).catch((e: unknown) => e);

    expect(error).toMatchObject(TOO_LARGE);
    expect(isUserFacingError(error)).toBe(true);
  });

  it('maps an HTML 413 on report download the same way', async () => {
    const html = new Response('<html><body>413</body></html>', {
      status: 413,
      headers: { 'Content-Type': 'text/html' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(html));

    await expect(
      downloadReport({
        file: new File(['PK'], 'a.xlsx'),
        viewId: 'all',
        format: 'pdf',
        report: { label: 'Ambas sucursales', period: { from: '2026-10-19', to: '2026-10-25' } },
      }),
    ).rejects.toMatchObject(TOO_LARGE);
  });
});

describe('downloadReport', () => {
  const report = { label: 'Ambas sucursales', period: { from: '2026-10-19', to: '2026-10-25' } };

  function pdfResponse(headers: Record<string, string> = {}): Response {
    return new Response('%PDF-1.7', {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', ...headers },
    });
  }

  it('posts the file and view id, and returns the blob with the server filename', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      pdfResponse({
        'Content-Disposition':
          'attachment; filename="grido-informe-almirante-2026-10-19-al-2026-10-25.pdf"',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['PK'], 'turnos.xlsx');

    const result = await downloadReport({ file, viewId: 'branch-1', format: 'pdf', report });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/exports/pdf');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('view')).toBe('branch-1');
    expect(result.filename).toBe('grido-informe-almirante-2026-10-19-al-2026-10-25.pdf');
    expect(await result.blob.text()).toBe('%PDF-1.7');
  });

  it('falls back to the contract filename without a usable Content-Disposition', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pdfResponse()));

    const result = await downloadReport({
      file: new File(['PK'], 'turnos.xlsx'),
      viewId: 'all',
      format: 'xlsx',
      report,
    });

    expect(result.filename).toBe('grido-informe-ambas-sucursales-2026-10-19-al-2026-10-25.xlsx');
  });

  it('surfaces the API error envelope', async () => {
    const envelope = { error: { code: 'INVALID_VIEW', message: 'Seleccione una vista válida.' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(envelope, 400)));

    await expect(
      downloadReport({ file: new File(['PK'], 'a.xlsx'), viewId: 'all', format: 'pdf', report }),
    ).rejects.toMatchObject({ code: 'INVALID_VIEW', status: 400 });
  });

  it('throws NETWORK_ERROR when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      downloadReport({ file: new File(['PK'], 'a.xlsx'), viewId: 'all', format: 'pdf', report }),
    ).rejects.toMatchObject({ code: ClientErrorCode.NetworkError });
  });
});

describe('fileNameFromDisposition', () => {
  it.each([
    ['attachment; filename="informe.pdf"', 'informe.pdf'],
    ['attachment; filename=informe.xlsx', 'informe.xlsx'],
    ["attachment; filename*=UTF-8''informe%20semanal.pdf", 'informe semanal.pdf'],
    ['attachment; filename="../../etc/informe.pdf"', 'informe.pdf'],
  ])('%s → %s', (header, name) => {
    expect(fileNameFromDisposition(header)).toBe(name);
  });

  it.each([null, '', 'attachment', 'attachment; filename=""'])('%s → undefined', (header) => {
    expect(fileNameFromDisposition(header)).toBeUndefined();
  });
});
