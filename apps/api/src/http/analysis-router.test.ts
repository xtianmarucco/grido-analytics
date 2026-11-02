import {
  analysisResponseSchema,
  ErrorCode,
  errorResponseSchema,
  ImportWarningCode,
} from '@grido/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  buildWorkbook,
  buildZip,
  excelDate,
  SHIFT_HEADERS,
  shiftRow,
} from '../import/test-utils/workbook.js';
import { createApp } from './app.js';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function upload(buffer: Buffer, filename = 'turnos.xlsx', contentType = XLSX_TYPE) {
  return request(createApp())
    .post('/api/analysis')
    .attach('file', buffer, { filename, contentType });
}

function expectError(response: request.Response, status: number, code: string) {
  expect(response.status).toBe(status);
  const body = errorResponseSchema.parse(response.body);
  expect(body.error.code).toBe(code);
  return body.error;
}

describe('POST /api/analysis: accepted files', () => {
  it('responds 200 with the import section', async () => {
    const buffer = await buildWorkbook({
      rows: [
        shiftRow({ usulogin: 'ana' }),
        shiftRow({ usulogin: 'Bruno', succodigo: 'Barranquer', sucursal: 2 }),
      ],
    });

    const response = await upload(buffer);

    expect(response.status).toBe(200);
    const body = analysisResponseSchema.parse(response.body);
    expect(body.import.shifts).toHaveLength(2);
    expect(body.import.branches.map((b) => b.name)).toEqual(['Almirante', 'Barranqueras']);
    expect(body.import.period).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(body.import.warnings).toEqual([]);
  });

  it('adds the analysis views next to the import section', async () => {
    const buffer = await buildWorkbook({
      rows: [
        shiftRow({
          usulogin: 'ana',
          totaltiquets: 40,
          sv_noactivada: 10,
          sv_rechazada: 20,
          sv_aceptada: 10,
        }),
        shiftRow({
          usulogin: 'Dario',
          totaltiquets: 20,
          sv_noactivada: 0,
          sv_rechazada: 20,
          sv_aceptada: 0,
        }),
        shiftRow({
          usulogin: 'dario ',
          succodigo: 'Barranquer',
          sucursal: 2,
          totaltiquets: 20,
          sv_noactivada: 0,
          sv_rechazada: 15,
          sv_aceptada: 5,
        }),
      ],
    });

    const response = await upload(buffer);

    expect(response.status).toBe(200);
    const body = analysisResponseSchema.parse(response.body);
    expect(body.views.map((v) => [v.id, v.label, v.summary.cashierCount])).toEqual([
      ['branch-1', 'Almirante', 2],
      ['branch-2', 'Barranqueras', 1],
      ['all', 'Ambas sucursales', 2],
    ]);
    const combined = body.views[2];
    expect(
      combined?.ranking.map((e) => [e.cashierName, e.branchCodes, e.tickets, e.effectiveness]),
    ).toEqual([
      ['Ana', [1], 40, (10 / 30) * 100],
      ['Dario', [1, 2], 40, (5 / 40) * 100],
    ]);
    expect(combined?.podium.map((s) => s.status)).toEqual(['filled', 'filled', 'vacant']);
    expect(body.views[1]?.ranking[0]?.ineligibilityReasons.map((r) => r.code)).toEqual([
      'MIN_TICKETS',
    ]);
  });

  it('processes the remaining rows and reports invalid rows and duplicates as warnings', async () => {
    const duplicated = shiftRow({ turno: 40 });
    const buffer = await buildWorkbook({
      rows: [shiftRow(), shiftRow({ totaltiquets: -5 }), duplicated, { ...duplicated }],
    });

    const response = await upload(buffer);

    expect(response.status).toBe(200);
    const body = analysisResponseSchema.parse(response.body);
    expect(body.import.shifts).toHaveLength(2);
    expect(body.import.warnings.map((w) => [w.code, w.row])).toEqual([
      [ImportWarningCode.InvalidValue, 3],
      [ImportWarningCode.DuplicateShift, 4],
    ]);
    expect(body.import.summary).toEqual({ totalRows: 4, includedRows: 2, excludedRows: 2 });
  });

  it('accepts a generic binary content type (curl, some browsers)', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow()] });

    const response = await upload(buffer, 'TURNOS.XLSX', 'application/octet-stream');

    expect(response.status).toBe(200);
  });
});

describe('POST /api/analysis: upload rejections', () => {
  it('400 FILE_REQUIRED when the multipart body has no file', async () => {
    const response = await request(createApp()).post('/api/analysis').field('note', 'x');

    expect(expectError(response, 400, ErrorCode.FileRequired).message).toMatch(/archivo/i);
  });

  it('400 FILE_REQUIRED for a non-multipart body', async () => {
    const response = await request(createApp()).post('/api/analysis').send({ file: 'x' });

    expectError(response, 400, ErrorCode.FileRequired);
  });

  it('400 INVALID_UPLOAD when the file comes in another field', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow()] });

    const response = await request(createApp())
      .post('/api/analysis')
      .attach('excel', buffer, { filename: 'turnos.xlsx', contentType: XLSX_TYPE });

    expectError(response, 400, ErrorCode.InvalidUpload);
  });

  it('400 INVALID_UPLOAD for more than one file', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow()] });

    const response = await request(createApp())
      .post('/api/analysis')
      .attach('file', buffer, { filename: 'a.xlsx', contentType: XLSX_TYPE })
      .attach('file', buffer, { filename: 'b.xlsx', contentType: XLSX_TYPE });

    expectError(response, 400, ErrorCode.InvalidUpload);
  });

  it('415 UNSUPPORTED_FILE_TYPE for a .csv', async () => {
    const response = await upload(Buffer.from('turno,usulogin\n1,ana\n'), 'turnos.csv', 'text/csv');

    expect(expectError(response, 415, ErrorCode.UnsupportedFileType).message).toContain('.xlsx');
  });

  it('415 UNSUPPORTED_FILE_TYPE for a text file renamed to .xlsx', async () => {
    const response = await upload(Buffer.from('esto no es un excel'), 'turnos.xlsx');

    expectError(response, 415, ErrorCode.UnsupportedFileType);
  });

  it('415 UNSUPPORTED_FILE_TYPE for an .xlsx name with a text content type', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow()] });

    const response = await upload(buffer, 'turnos.xlsx', 'text/plain');

    expectError(response, 415, ErrorCode.UnsupportedFileType);
  });

  it('413 FILE_TOO_LARGE above 4 MB (below the 4.5 MB Vercel body limit)', async () => {
    const big = Buffer.alloc(4 * 1024 * 1024 + 1, 0x41);

    const response = await upload(big);

    const error = expectError(response, 413, ErrorCode.FileTooLarge);
    expect(error.message).toBe('El archivo supera el tamaño máximo de 4 MB.');
    expect(error.details).toEqual({ maxBytes: 4 * 1024 * 1024 });
  });
});

describe('POST /api/analysis: workbook rejections', () => {
  it('422 MISSING_COLUMNS listing the missing column', async () => {
    const headers = SHIFT_HEADERS.filter((h) => h !== 'sv_aceptada');
    const buffer = await buildWorkbook({ headers, rows: [shiftRow()] });

    const response = await upload(buffer);

    const error = expectError(response, 422, ErrorCode.MissingColumns);
    expect(error.details).toEqual({ missing: ['sv_aceptada'] });
    expect(error.message).toContain('sv_aceptada');
  });

  it('422 MISSING_COLUMNS when a cash control column is missing', async () => {
    const headers = SHIFT_HEADERS.filter((h) => h !== 'turdiferencia');
    const buffer = await buildWorkbook({ headers, rows: [shiftRow()] });

    const response = await upload(buffer);

    const error = expectError(response, 422, ErrorCode.MissingColumns);
    expect(error.details).toEqual({ missing: ['turdiferencia'] });
  });

  it('422 UNREADABLE_FILE for a corrupt ZIP', async () => {
    const corrupt = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(200, 7)]);

    const response = await upload(corrupt);

    expectError(response, 422, ErrorCode.UnreadableFile);
  });

  it('422 UNREADABLE_FILE for a ZIP that is not a workbook', async () => {
    const response = await upload(buildZip([{ name: 'hola.txt', content: 'hola' }]));

    expectError(response, 422, ErrorCode.UnreadableFile);
  });

  it('422 EMPTY_FILE for a header without rows', async () => {
    const response = await upload(await buildWorkbook({ rows: [] }));

    expectError(response, 422, ErrorCode.EmptyFile);
  });

  it('422 MULTIPLE_PERIODS when rows belong to different weeks', async () => {
    const buffer = await buildWorkbook({
      rows: [
        shiftRow(),
        shiftRow({
          desde: excelDate('2026-10-26T00:00:00'),
          hasta: excelDate('2026-11-01T00:00:00'),
        }),
      ],
    });

    const response = await upload(buffer);

    expectError(response, 422, ErrorCode.MultiplePeriods);
  });

  it('422 NO_VALID_ROWS with the warnings in details', async () => {
    const response = await upload(await buildWorkbook({ rows: [shiftRow({ usulogin: '' })] }));

    const error = expectError(response, 422, ErrorCode.NoValidRows);
    expect(error.details).toMatchObject({
      warnings: [{ code: ImportWarningCode.InvalidValue, row: 2 }],
    });
  });
});

describe('/api/analysis other methods', () => {
  it('GET is an unknown route', async () => {
    const response = await request(createApp()).get('/api/analysis');

    expectError(response, 404, ErrorCode.NotFound);
  });
});
