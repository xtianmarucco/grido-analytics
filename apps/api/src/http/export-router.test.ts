import { ErrorCode, errorResponseSchema } from '@grido/shared';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { buildWorkbook, SHIFT_HEADERS, shiftRow } from '../import/test-utils/workbook.js';
import { createApp } from './app.js';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Format = 'pdf' | 'xlsx';

/** Collects a binary body into a Buffer, whatever the content type. */
function binary(res: request.Response, done: (error: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
}

function exportReport(
  format: Format,
  options: { buffer?: Buffer; view?: string; filename?: string; contentType?: string } = {},
) {
  let req = request(createApp()).post(`/api/exports/${format}`).buffer(true).parse(binary);
  if (options.view !== undefined) req = req.field('view', options.view);
  if (options.buffer) {
    req = req.attach('file', options.buffer, {
      filename: options.filename ?? 'turnos.xlsx',
      contentType: options.contentType ?? XLSX_TYPE,
    });
  }
  return req;
}

function sampleWorkbook(): Promise<Buffer> {
  return buildWorkbook({
    rows: [
      shiftRow({ usulogin: 'ana' }),
      shiftRow({ usulogin: 'bruno', succodigo: 'Barranquer', sucursal: 2 }),
    ],
  });
}

function expectError(response: request.Response, status: number, code: string) {
  expect(response.status).toBe(status);
  const body = errorResponseSchema.parse(JSON.parse((response.body as Buffer).toString('utf8')));
  expect(body.error.code).toBe(code);
  return body.error;
}

describe('POST /api/exports/pdf', () => {
  it('returns the PDF of the selected view as a download', async () => {
    const response = await exportReport('pdf', { buffer: await sampleWorkbook(), view: 'all' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="grido-informe-ambas-sucursales-2026-10-19-al-2026-10-25.pdf"',
    );
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.body as Buffer;
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(Number(response.headers['content-length'])).toBe(body.length);
  });
});

describe('POST /api/exports/xlsx', () => {
  it('returns the Excel workbook of the selected view', async () => {
    const response = await exportReport('xlsx', {
      buffer: await sampleWorkbook(),
      view: 'branch-2',
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe(XLSX_TYPE);
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="grido-informe-barranqueras-2026-10-19-al-2026-10-25.xlsx"',
    );
    expect(response.headers['cache-control']).toBe('no-store');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      'Resumen',
      'Ranking',
      'Podio',
      'Observaciones',
      'Control de caja',
    ]);
    expect(workbook.getWorksheet('Ranking')?.getCell('B2').value).toBe('Bruno');
  });
});

describe.each<Format>(['pdf', 'xlsx'])('POST /api/exports/%s: rejections', (format) => {
  it('400 INVALID_VIEW without a view', async () => {
    const error = expectError(
      await exportReport(format, { buffer: await sampleWorkbook() }),
      400,
      ErrorCode.InvalidView,
    );
    expect(error.message).toBe('Seleccione una vista válida para generar el informe.');
  });

  it('400 INVALID_VIEW for a malformed view id', async () => {
    expectError(
      await exportReport(format, { buffer: await sampleWorkbook(), view: 'combined' }),
      400,
      ErrorCode.InvalidView,
    );
  });

  it('400 INVALID_VIEW for a branch the file does not have', async () => {
    const error = expectError(
      await exportReport(format, { buffer: await sampleWorkbook(), view: 'branch-9' }),
      400,
      ErrorCode.InvalidView,
    );
    expect(error.message).toBe('La vista seleccionada no existe en este archivo.');
  });

  it('400 FILE_REQUIRED without a file', async () => {
    expectError(await exportReport(format, { view: 'all' }), 400, ErrorCode.FileRequired);
  });

  it('415 UNSUPPORTED_FILE_TYPE for a text file', async () => {
    expectError(
      await exportReport(format, {
        buffer: Buffer.from('not a workbook'),
        filename: 'notes.txt',
        contentType: 'text/plain',
        view: 'all',
      }),
      415,
      ErrorCode.UnsupportedFileType,
    );
  });

  it('422 with the same import error as the analysis', async () => {
    const buffer = await buildWorkbook({
      headers: SHIFT_HEADERS.filter((header) => header !== 'usulogin'),
      rows: [shiftRow()],
    });
    const error = expectError(
      await exportReport(format, { buffer, view: 'all' }),
      422,
      ErrorCode.MissingColumns,
    );
    expect(error.details).toEqual({ missing: ['usulogin'] });
  });
});
