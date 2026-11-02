import { describe, expect, it } from 'vitest';

import { importShiftWorkbook } from './import-shift-workbook.js';
import { buildWorkbook, excelDate, shiftRow } from './test-utils/workbook.js';

describe('importShiftWorkbook', () => {
  it('reads and normalizes a workbook end to end, keeping wall-clock times', async () => {
    const buffer = await buildWorkbook({
      rows: [
        shiftRow({ usulogin: 'Ana', turiniciaturno: new Date('2026-10-19T07:08:59.999Z') }),
        shiftRow({
          usulogin: 'carla',
          succodigo: 'Barranquer',
          sucursal: 2,
          turiniciaturno: excelDate('2026-10-20T06:45:00'),
          turcierre: excelDate('2026-10-20T14:10:00'),
        }),
      ],
    });

    const result = await importShiftWorkbook(buffer);

    expect(result.period).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(result.branches.map((b) => b.name)).toEqual(['Almirante', 'Barranqueras']);
    expect(result.shifts.map((s) => [s.cashierName, s.startedAt])).toEqual([
      ['Ana', '2026-10-19T07:09:00'],
      ['Carla', '2026-10-20T06:45:00'],
    ]);
    expect(result.warnings).toEqual([]);
  });
});
