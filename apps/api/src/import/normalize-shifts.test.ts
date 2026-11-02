import { ErrorCode, ImportWarningCode } from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { ImportError } from './errors.js';
import { normalizeShifts } from './normalize-shifts.js';
import type { RawCell, RawRow, RequiredColumn } from './read-workbook.js';

const wallClock = (iso: string) => new Date(`${iso}Z`);

let nextTurno = 500;

function raw(row: number, overrides: Partial<Record<RequiredColumn, RawCell>> = {}): RawRow {
  nextTurno += 1;
  return {
    row,
    values: {
      succodigo: 'Almirante',
      sucursal: 1,
      turno: nextTurno,
      usulogin: 'ana',
      turiniciaturno: wallClock('2026-10-19T08:00:00'),
      turcierre: wallClock('2026-10-19T15:30:00'),
      totaltiquets: 40,
      sv_noactivada: 10,
      sv_rechazada: 20,
      sv_aceptada: 10,
      venta: 132600.01,
      turefectivo: 52300.5,
      ventaclubgrido: 80000,
      turdiferencia: -1530,
      desde: wallClock('2026-10-19T00:00:00'),
      hasta: wallClock('2026-10-25T00:00:00'),
      ...overrides,
    },
  };
}

function rejection(run: () => unknown): ImportError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ImportError);
    return error as ImportError;
  }
  throw new Error('Expected an ImportError');
}

describe('normalizeShifts: valid rows', () => {
  it('normalizes a shift', () => {
    const result = normalizeShifts([
      raw(2, {
        turno: 77,
        usulogin: '  ANA ',
        succodigo: 'Barranquer',
        sucursal: 2,
        turiniciaturno: wallClock('2026-10-20T13:38:00'),
        turcierre: wallClock('2026-10-20T21:05:00'),
      }),
    ]);

    expect(result.shifts).toEqual([
      {
        row: 2,
        turno: 77,
        branchCode: 2,
        branchName: 'Barranqueras',
        cashierKey: 'ana',
        cashierName: 'Ana',
        startedAt: '2026-10-20T13:38:00',
        closedAt: '2026-10-20T21:05:00',
        tickets: 40,
        noActivadas: 10,
        rechazadas: 20,
        aceptadas: 10,
        activadas: 30,
        venta: 132600.01,
        turEfectivo: 52300.5,
        ventaClubGrido: 80000,
        turDiferencia: -1530,
        slot: 'dia',
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it.each([
    ['2026-10-19T00:00:00', 'dia'],
    ['2026-10-19T14:59:59', 'dia'],
    ['2026-10-19T15:00:00', 'noche'],
    ['2026-10-19T23:30:00', 'noche'],
  ])('assigns a shift starting at %s to the %s slot (wall clock)', (start, slot) => {
    const { shifts } = normalizeShifts([
      raw(2, { turiniciaturno: wallClock(start), turcierre: wallClock('2026-10-19T23:59:00') }),
    ]);

    expect(shifts[0]?.slot).toBe(slot);
  });

  it('reads money as decimals, rounds them to cents and keeps a positive difference', () => {
    const { shifts } = normalizeShifts([
      raw(2, { venta: '1000.5', turefectivo: 0, ventaclubgrido: 999.999, turdiferencia: 1600 }),
    ]);

    expect(shifts[0]).toMatchObject({
      venta: 1000.5,
      turEfectivo: 0,
      ventaClubGrido: 1000,
      turDiferencia: 1600,
    });
  });

  it('gives the same identity to logins that differ only in case', () => {
    const { shifts } = normalizeShifts([
      raw(2, { usulogin: 'bruno' }),
      raw(3, { usulogin: 'BRUNO' }),
    ]);

    expect(shifts.map((s) => [s.cashierKey, s.cashierName])).toEqual([
      ['bruno', 'Bruno'],
      ['bruno', 'Bruno'],
    ]);
  });

  it('rounds date-times to the nearest second (Excel float artifacts)', () => {
    const { shifts } = normalizeShifts([
      raw(2, {
        turiniciaturno: new Date('2026-10-19T07:08:59.999Z'),
        turcierre: new Date('2026-10-19T21:00:00.400Z'),
      }),
    ]);

    expect(shifts[0]).toMatchObject({
      startedAt: '2026-10-19T07:09:00',
      closedAt: '2026-10-19T21:00:00',
    });
  });

  it('accepts numeric text for counts and logins, and Excel serial numbers for dates', () => {
    const { shifts, warnings } = normalizeShifts([
      raw(2, {
        totaltiquets: ' 40 ',
        usulogin: 1234,
        // 2026-10-19 08:00 as an Excel serial (days since 1899-12-30).
        turiniciaturno: 46314 + 8 / 24,
      }),
    ]);

    expect(warnings).toEqual([]);
    expect(shifts[0]).toMatchObject({
      tickets: 40,
      cashierKey: '1234',
      startedAt: '2026-10-19T08:00:00',
    });
  });

  it('reports the period, branches with shift counts, and shifts sorted by branch and start', () => {
    const result = normalizeShifts([
      raw(2, { succodigo: 'Barranquer', sucursal: 2 }),
      raw(3, { turcierre: wallClock('2026-10-21T15:00:00') }),
      raw(4, { turiniciaturno: wallClock('2026-10-19T07:00:00') }),
    ]);

    expect(result.period).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(result.branches).toEqual([
      { code: 1, name: 'Almirante', shiftCount: 2 },
      { code: 2, name: 'Barranqueras', shiftCount: 1 },
    ]);
    expect(result.shifts.map((s) => s.row)).toEqual([4, 3, 2]);
    expect(result.summary).toEqual({ totalRows: 3, includedRows: 3, excludedRows: 0 });
  });
});

describe('normalizeShifts: invalid rows', () => {
  it.each<[string, Partial<Record<RequiredColumn, RawCell>>, string]>([
    ['a negative count', { sv_rechazada: -1, sv_noactivada: 31 }, 'sv_rechazada'],
    ['a fractional count', { totaltiquets: 40.5 }, 'totaltiquets'],
    ['an empty cashier', { usulogin: '   ' }, 'usulogin'],
    ['a text date', { turcierre: 'ayer' }, 'turcierre'],
    ['a zero turno', { turno: 0 }, 'turno'],
    ['a non-numeric branch code', { sucursal: 'uno' }, 'sucursal'],
    ['an empty branch name', { succodigo: null }, 'succodigo'],
    ['a boolean count', { sv_aceptada: true }, 'sv_aceptada'],
    ['negative sales', { venta: -0.01 }, 'venta'],
    ['negative cash', { turefectivo: -5 }, 'turefectivo'],
    ['negative Club Grido sales', { ventaclubgrido: -1 }, 'ventaclubgrido'],
    ['an empty cash difference', { turdiferencia: null }, 'turdiferencia'],
    ['a text amount', { venta: '$ 1.000' }, 'venta'],
    ['a date as an amount', { turefectivo: wallClock('2026-10-19T00:00:00') }, 'turefectivo'],
  ])('excludes a row with %s and warns', (_label, overrides, column) => {
    const result = normalizeShifts([raw(2), raw(3, overrides)]);

    expect(result.shifts.map((s) => s.row)).toEqual([2]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({ code: ImportWarningCode.InvalidValue, row: 3 });
    expect(result.warnings[0]?.message).toContain(column);
    expect(result.summary).toEqual({ totalRows: 2, includedRows: 1, excludedRows: 1 });
  });

  it('lists every invalid column of a row in one warning', () => {
    const { warnings } = normalizeShifts([
      raw(2),
      raw(3, { turno: 9, usulogin: '', totaltiquets: -2 }),
    ]);

    expect(warnings).toEqual([
      {
        code: ImportWarningCode.InvalidValue,
        row: 3,
        turno: 9,
        message:
          'Fila 3 (turno 9): valor vacío o inválido en usulogin, totaltiquets. La fila no se incluyó.',
      },
    ]);
  });

  it('excludes a shift that closes before it starts', () => {
    const { warnings } = normalizeShifts([
      raw(2),
      raw(3, { turcierre: wallClock('2026-10-19T07:00:00') }),
    ]);

    expect(warnings[0]).toMatchObject({ code: ImportWarningCode.InvalidValue, row: 3 });
    expect(warnings[0]?.message).toContain('anterior');
  });

  it('excludes a row whose counts do not add up to totaltiquets', () => {
    const { shifts, warnings } = normalizeShifts([raw(2), raw(3, { turno: 12, totaltiquets: 41 })]);

    expect(shifts).toHaveLength(1);
    expect(warnings).toEqual([
      {
        code: ImportWarningCode.TicketMismatch,
        row: 3,
        turno: 12,
        message:
          'Fila 3 (turno 12): sv_noactivada + sv_rechazada + sv_aceptada (40) no coincide con totaltiquets (41). La fila no se incluyó.',
      },
    ]);
  });

  it('excludes a row whose branch code already appeared with another name', () => {
    const { shifts, warnings } = normalizeShifts([raw(2), raw(3, { succodigo: 'Centro' })]);

    expect(shifts.map((s) => s.row)).toEqual([2]);
    expect(warnings[0]).toMatchObject({ code: ImportWarningCode.InvalidValue, row: 3 });
    expect(warnings[0]?.message).toContain('Almirante');
  });
});

describe('normalizeShifts: duplicate turno', () => {
  it('counts identical copies once and warns', () => {
    const first = raw(2, { turno: 30 });
    const copy = { row: 5, values: { ...first.values, usulogin: 'ANA' } };

    const result = normalizeShifts([first, raw(3), copy]);

    expect(result.shifts.filter((s) => s.turno === 30).map((s) => s.row)).toEqual([2]);
    expect(result.warnings).toEqual([
      {
        code: ImportWarningCode.DuplicateShift,
        row: 2,
        turno: 30,
        message:
          'El turno 30 de Almirante aparece 2 veces con los mismos datos (filas 2, 5). Se contó una sola vez.',
      },
    ]);
    expect(result.summary).toEqual({ totalRows: 3, includedRows: 2, excludedRows: 1 });
  });

  it('excludes every copy when the data differs', () => {
    const result = normalizeShifts([
      raw(2, { turno: 31 }),
      raw(3),
      raw(4, { turno: 31, sv_aceptada: 9, sv_noactivada: 11 }),
    ]);

    expect(result.shifts.map((s) => s.row)).toEqual([3]);
    expect(result.warnings).toEqual([
      {
        code: ImportWarningCode.ConflictingDuplicate,
        row: 2,
        turno: 31,
        message:
          'El turno 31 de Almirante aparece 2 veces con datos distintos (filas 2, 4). No se incluyó ninguna de esas filas.',
      },
    ]);
  });

  it('keeps the same turno number in different branches as different shifts', () => {
    const result = normalizeShifts([
      raw(2, { turno: 33 }),
      raw(3, {
        turno: 33,
        succodigo: 'Barranquer',
        sucursal: 2,
        sv_aceptada: 9,
        sv_noactivada: 11,
      }),
    ]);

    expect(result.shifts.map((s) => [s.branchCode, s.turno])).toEqual([
      [1, 33],
      [2, 33],
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('keeps the valid copy when the other copy is invalid', () => {
    const result = normalizeShifts([raw(2, { turno: 32 }), raw(3, { turno: 32, usulogin: '' })]);

    expect(result.shifts.map((s) => s.row)).toEqual([2]);
    expect(result.warnings.map((w) => w.code)).toEqual([ImportWarningCode.InvalidValue]);
  });
});

describe('normalizeShifts: whole-file rejections', () => {
  it('rejects rows from more than one period', () => {
    const error = rejection(() =>
      normalizeShifts([
        raw(2),
        raw(3, {
          desde: wallClock('2026-10-26T00:00:00'),
          hasta: wallClock('2026-11-01T00:00:00'),
        }),
      ]),
    );

    expect(error.code).toBe(ErrorCode.MultiplePeriods);
    expect(error.details).toEqual({
      periods: [
        { from: '2026-10-19', to: '2026-10-25' },
        { from: '2026-10-26', to: '2026-11-01' },
      ],
    });
    expect(error.message).toContain('19/10/2026 al 25/10/2026');
  });

  it('rejects a file where every row was excluded, with the warnings in details', () => {
    const error = rejection(() =>
      normalizeShifts([raw(2, { usulogin: '' }), raw(3, { totaltiquets: 1 })]),
    );

    expect(error.code).toBe(ErrorCode.NoValidRows);
    expect(error.details).toMatchObject({
      summary: { totalRows: 2, includedRows: 0, excludedRows: 2 },
      warnings: [
        { code: ImportWarningCode.InvalidValue, row: 2 },
        { code: ImportWarningCode.TicketMismatch, row: 3 },
      ],
    });
  });
});
