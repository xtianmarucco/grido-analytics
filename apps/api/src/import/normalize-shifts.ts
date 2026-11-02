import {
  ErrorCode,
  ImportWarningCode,
  type ImportResult,
  type ImportWarning,
  type NormalizedShift,
  ShiftSlot,
} from '@grido/shared';

import {
  parseCount,
  parseMoney,
  parseNonNegativeMoney,
  parsePositiveInteger,
  parseText,
  parseWallClock,
} from './cell-values.js';
import { ImportError } from './errors.js';
import type { RawRow, RequiredColumn } from './read-workbook.js';

/** Wall-clock hour from which a shift belongs to the night slot. */
export const NIGHT_SLOT_START_HOUR = 15;

/** `dia` when the shift starts before 15:00 (wall clock, no timezone conversion), else `noche`. */
export function shiftSlot(startedAt: string): ShiftSlot {
  return Number(startedAt.slice(11, 13)) < NIGHT_SLOT_START_HOUR ? ShiftSlot.Day : ShiftSlot.Night;
}

/** Source branch names that are abbreviated in the export. Keys are lowercase. */
const BRANCH_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  barranquer: 'Barranqueras',
};

interface Period {
  from: string;
  to: string;
}

type RowOutcome =
  { kind: 'shift'; shift: NormalizedShift } | { kind: 'excluded'; warning: ImportWarning };

/**
 * Validates and normalizes raw rows (pure). Invalid rows are excluded with a warning; nothing
 * is dropped silently. Throws `ImportError` for `MULTIPLE_PERIODS` and `NO_VALID_ROWS`.
 */
export function normalizeShifts(rows: readonly RawRow[]): ImportResult {
  const period = singlePeriod(rows);

  const warnings: ImportWarning[] = [];
  const candidates: NormalizedShift[] = [];
  for (const row of rows) {
    const outcome = normalizeRow(row);
    if (outcome.kind === 'shift') candidates.push(outcome.shift);
    else warnings.push(outcome.warning);
  }

  const deduplicated = removeDuplicates(candidates, warnings);
  const shifts = enforceBranchNames(deduplicated, warnings).sort(compareShifts);

  const summary = {
    totalRows: rows.length,
    includedRows: shifts.length,
    excludedRows: rows.length - shifts.length,
  };
  warnings.sort((a, b) => (a.row ?? Infinity) - (b.row ?? Infinity));

  if (shifts.length === 0 || period === undefined) {
    throw new ImportError(
      ErrorCode.NoValidRows,
      'Ninguna fila del archivo es válida. Revise las advertencias y corrija el archivo.',
      { warnings, summary },
    );
  }

  return { period, branches: summarizeBranches(shifts), shifts, warnings, summary };
}

function singlePeriod(rows: readonly RawRow[]): Period | undefined {
  const periods = new Map<string, Period>();
  for (const { values } of rows) {
    const from = parseWallClock(values.desde)?.slice(0, 10);
    const to = parseWallClock(values.hasta)?.slice(0, 10);
    if (from && to) periods.set(`${from}/${to}`, { from, to });
  }
  const distinct = [...periods.values()].sort((a, b) => a.from.localeCompare(b.from));
  if (distinct.length > 1) {
    const list = distinct.map((p) => `${displayDate(p.from)} al ${displayDate(p.to)}`).join('; ');
    throw new ImportError(
      ErrorCode.MultiplePeriods,
      `El archivo contiene más de un período (${list}). Cargue un reporte de una sola semana.`,
      { periods: distinct },
    );
  }
  return distinct[0];
}

function normalizeRow({ row, values }: RawRow): RowOutcome {
  const invalid: RequiredColumn[] = [];
  function check<T>(column: RequiredColumn, parsed: T | undefined): T | undefined {
    if (parsed === undefined) invalid.push(column);
    return parsed;
  }

  const branchName = check('succodigo', parseText(values.succodigo));
  const branchCode = check('sucursal', parsePositiveInteger(values.sucursal));
  const turno = check('turno', parsePositiveInteger(values.turno));
  const login = check('usulogin', parseText(values.usulogin));
  const startedAt = check('turiniciaturno', parseWallClock(values.turiniciaturno));
  const closedAt = check('turcierre', parseWallClock(values.turcierre));
  const tickets = check('totaltiquets', parseCount(values.totaltiquets));
  const noActivadas = check('sv_noactivada', parseCount(values.sv_noactivada));
  const rechazadas = check('sv_rechazada', parseCount(values.sv_rechazada));
  const aceptadas = check('sv_aceptada', parseCount(values.sv_aceptada));
  const venta = check('venta', parseNonNegativeMoney(values.venta));
  const turEfectivo = check('turefectivo', parseNonNegativeMoney(values.turefectivo));
  const turDiferencia = check('turdiferencia', parseMoney(values.turdiferencia));
  const ventaClubGrido = check('ventaclubgrido', parseNonNegativeMoney(values.ventaclubgrido));
  const from = check('desde', parseWallClock(values.desde));
  const to = check('hasta', parseWallClock(values.hasta));

  const label = turno === undefined ? `Fila ${row}` : `Fila ${row} (turno ${turno})`;
  const exclude = (code: ImportWarningCode, reason: string): RowOutcome => ({
    kind: 'excluded',
    warning: {
      code,
      message: `${label}: ${reason}. La fila no se incluyó.`,
      row,
      ...(turno === undefined ? {} : { turno }),
    },
  });

  if (
    invalid.length > 0 ||
    branchName === undefined ||
    branchCode === undefined ||
    turno === undefined ||
    login === undefined ||
    startedAt === undefined ||
    closedAt === undefined ||
    tickets === undefined ||
    noActivadas === undefined ||
    rechazadas === undefined ||
    aceptadas === undefined ||
    venta === undefined ||
    turEfectivo === undefined ||
    turDiferencia === undefined ||
    ventaClubGrido === undefined ||
    from === undefined ||
    to === undefined
  ) {
    return exclude(
      ImportWarningCode.InvalidValue,
      `valor vacío o inválido en ${invalid.join(', ')}`,
    );
  }
  // ISO wall-clock strings of the same shape compare chronologically as text.
  if (closedAt < startedAt) {
    return exclude(ImportWarningCode.InvalidValue, 'el cierre del turno es anterior a su inicio');
  }
  if (to < from) {
    return exclude(ImportWarningCode.InvalidValue, 'la fecha "desde" es posterior a "hasta"');
  }
  const counted = noActivadas + rechazadas + aceptadas;
  if (counted !== tickets) {
    return exclude(
      ImportWarningCode.TicketMismatch,
      `sv_noactivada + sv_rechazada + sv_aceptada (${counted}) no coincide con totaltiquets (${tickets})`,
    );
  }

  const cashierKey = login.toLowerCase();
  return {
    kind: 'shift',
    shift: {
      row,
      turno,
      branchCode,
      branchName: BRANCH_DISPLAY_NAMES[branchName.toLowerCase()] ?? branchName,
      cashierKey,
      cashierName: cashierKey.charAt(0).toUpperCase() + cashierKey.slice(1),
      startedAt,
      closedAt,
      tickets,
      noActivadas,
      rechazadas,
      aceptadas,
      activadas: rechazadas + aceptadas,
      venta,
      turEfectivo,
      ventaClubGrido,
      turDiferencia,
      slot: shiftSlot(startedAt),
    },
  };
}

/** Same `turno`: identical copies count once; differing copies are all excluded. */
function removeDuplicates(shifts: NormalizedShift[], warnings: ImportWarning[]): NormalizedShift[] {
  const groups = new Map<number, NormalizedShift[]>();
  for (const shift of shifts) {
    const group = groups.get(shift.turno);
    if (group) group.push(shift);
    else groups.set(shift.turno, [shift]);
  }

  const kept: NormalizedShift[] = [];
  for (const [turno, group] of groups) {
    const [first] = group;
    if (!first) continue;
    if (group.length === 1) {
      kept.push(first);
      continue;
    }
    const rows = group.map((s) => s.row).join(', ');
    const identical = group.every((s) => sameData(s, first));
    if (identical) kept.push(first);
    warnings.push({
      code: identical ? ImportWarningCode.DuplicateShift : ImportWarningCode.ConflictingDuplicate,
      message: identical
        ? `El turno ${turno} aparece ${group.length} veces con los mismos datos (filas ${rows}). Se contó una sola vez.`
        : `El turno ${turno} aparece ${group.length} veces con datos distintos (filas ${rows}). No se incluyó ninguna de esas filas.`,
      row: first.row,
      turno,
    });
  }
  return kept;
}

function sameData(a: NormalizedShift, b: NormalizedShift): boolean {
  const { row: _a, ...restA } = a;
  const { row: _b, ...restB } = b;
  return JSON.stringify(restA) === JSON.stringify(restB);
}

/** A branch code keeps the first name it appears with (sheet order); later mismatches are excluded. */
function enforceBranchNames(
  shifts: NormalizedShift[],
  warnings: ImportWarning[],
): NormalizedShift[] {
  const names = new Map<number, string>();
  return [...shifts]
    .sort((a, b) => a.row - b.row)
    .filter((shift) => {
      const known = names.get(shift.branchCode);
      if (known === undefined) {
        names.set(shift.branchCode, shift.branchName);
        return true;
      }
      if (known === shift.branchName) return true;
      warnings.push({
        code: ImportWarningCode.InvalidValue,
        message: `Fila ${shift.row} (turno ${shift.turno}): la sucursal ${shift.branchCode} ya figura como "${known}" y aquí como "${shift.branchName}". La fila no se incluyó.`,
        row: shift.row,
        turno: shift.turno,
      });
      return false;
    });
}

function summarizeBranches(shifts: readonly NormalizedShift[]): ImportResult['branches'] {
  const branches = new Map<number, { code: number; name: string; shiftCount: number }>();
  for (const shift of shifts) {
    const branch = branches.get(shift.branchCode);
    if (branch) branch.shiftCount += 1;
    else
      branches.set(shift.branchCode, {
        code: shift.branchCode,
        name: shift.branchName,
        shiftCount: 1,
      });
  }
  return [...branches.values()].sort((a, b) => a.code - b.code);
}

function compareShifts(a: NormalizedShift, b: NormalizedShift): number {
  return a.branchCode - b.branchCode || a.startedAt.localeCompare(b.startedAt) || a.turno - b.turno;
}

function displayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
