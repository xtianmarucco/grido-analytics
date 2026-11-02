import { ErrorCode } from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { ImportError } from './errors.js';
import { readShiftRows, REQUIRED_COLUMNS } from './read-workbook.js';
import {
  buildWorkbook,
  buildZip,
  excelDate,
  SHIFT_HEADERS,
  shiftRow,
} from './test-utils/workbook.js';

async function rejection(promise: Promise<unknown>): Promise<ImportError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ImportError);
  return error as ImportError;
}

describe('readShiftRows', () => {
  it('returns the required columns of each data row with its sheet row number', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow({ turno: 7, usulogin: 'Bruno' })] });

    const rows = await readShiftRows(buffer);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.row).toBe(2);
    expect(Object.keys(rows[0]?.values ?? {}).sort()).toEqual([...REQUIRED_COLUMNS].sort());
    expect(rows[0]?.values).toMatchObject({
      turno: 7,
      usulogin: 'Bruno',
      succodigo: 'Almirante',
      turiniciaturno: excelDate('2026-10-19T08:00:00'),
    });
  });

  it('matches headers trimmed and case-insensitively, in any order', async () => {
    const headers = [...SHIFT_HEADERS].reverse().map((h) => `  ${h.toUpperCase()} `);
    const row = Object.fromEntries(
      Object.entries(shiftRow({ turno: 8 })).map(([key, value]) => [
        `  ${key.toUpperCase()} `,
        value,
      ]),
    );

    const rows = await readShiftRows(await buildWorkbook({ headers, rows: [row] }));

    expect(rows[0]?.values.turno).toBe(8);
  });

  it('skips fully empty rows but keeps the real sheet row numbers', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow(), null, shiftRow()] });

    const rows = await readShiftRows(buffer);

    expect(rows.map((r) => r.row)).toEqual([2, 4]);
  });

  it('reads only the first worksheet', async () => {
    const buffer = await buildWorkbook(
      { rows: [shiftRow({ turno: 1 })] },
      { rows: [shiftRow({ turno: 2 }), shiftRow({ turno: 3 })] },
    );

    const rows = await readShiftRows(buffer);

    expect(rows.map((r) => r.values.turno)).toEqual([1]);
  });

  it('unwraps formula results, rich text and hyperlinks', async () => {
    const buffer = await buildWorkbook({
      rows: [
        shiftRow({
          totaltiquets: { formula: 'J2+K2+L2', result: 40 },
          usulogin: { richText: [{ text: 'An' }, { text: 'a' }] },
          succodigo: { text: 'Almirante', hyperlink: 'https://example.com' },
        }),
      ],
    });

    const [row] = await readShiftRows(buffer);

    expect(row?.values).toMatchObject({
      totaltiquets: 40,
      usulogin: 'Ana',
      succodigo: 'Almirante',
    });
  });

  it('turns error cells into empty values', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow({ sv_aceptada: { error: '#N/A' } })] });

    const [row] = await readShiftRows(buffer);

    expect(row?.values.sv_aceptada).toBeNull();
  });

  it('rejects a workbook missing required columns, listing them in column order', async () => {
    const headers = SHIFT_HEADERS.filter((h) => h !== 'sv_aceptada' && h !== 'turno');

    const error = await rejection(
      readShiftRows(await buildWorkbook({ headers, rows: [shiftRow()] })),
    );

    expect(error.code).toBe(ErrorCode.MissingColumns);
    expect(error.details).toEqual({ missing: ['turno', 'sv_aceptada'] });
    expect(error.message).toContain('turno, sv_aceptada');
  });

  it('rejects an empty worksheet', async () => {
    const error = await rejection(readShiftRows(await buildWorkbook({ headers: [] })));

    expect(error.code).toBe(ErrorCode.EmptyFile);
  });

  it('rejects a header without data rows', async () => {
    const error = await rejection(readShiftRows(await buildWorkbook({ rows: [] })));

    expect(error.code).toBe(ErrorCode.EmptyFile);
  });

  it('rejects more data rows than the limit', async () => {
    const buffer = await buildWorkbook({ rows: [shiftRow(), shiftRow(), shiftRow()] });

    const error = await rejection(readShiftRows(buffer, { maxRows: 2 }));

    expect(error.code).toBe(ErrorCode.TooManyRows);
    expect(error.details).toEqual({ maxRows: 2 });
  });

  it('rejects bytes that are not a ZIP', async () => {
    const error = await rejection(readShiftRows(Buffer.from('turno;usulogin\n1;ana\n')));

    expect(error.code).toBe(ErrorCode.UnreadableFile);
  });

  it('rejects a ZIP that is not a workbook', async () => {
    const error = await rejection(readShiftRows(buildZip([{ name: 'a.txt', content: 'hola' }])));

    expect(error.code).toBe(ErrorCode.UnreadableFile);
  });

  it('rejects a ZIP whose declared uncompressed size exceeds the limit, before inflating it', async () => {
    const zip = buildZip([{ name: 'xl/big.xml', content: 'x', declaredSize: 2_000_000 }]);

    const error = await rejection(readShiftRows(zip, { maxUncompressedBytes: 1_000_000 }));

    expect(error.code).toBe(ErrorCode.FileTooLarge);
  });
});
