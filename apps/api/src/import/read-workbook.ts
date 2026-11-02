import { ErrorCode } from '@grido/shared';
import ExcelJS from 'exceljs';

import { ImportError, unreadableFile } from './errors.js';
import { assertZipWithinLimits } from './zip-guard.js';

/** Columns the import needs, in source-file order. Every other column is ignored. */
export const REQUIRED_COLUMNS = [
  'succodigo',
  'sucursal',
  'turno',
  'usulogin',
  'turiniciaturno',
  'turcierre',
  'venta',
  'turefectivo',
  'turdiferencia',
  'ventaclubgrido',
  'totaltiquets',
  'sv_noactivada',
  'sv_rechazada',
  'sv_aceptada',
  'desde',
  'hasta',
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

/** A cell reduced to a primitive. Formula results, rich text and hyperlinks are unwrapped. */
export type RawCell = string | number | boolean | Date | null;

export interface RawRow {
  /** 1-based sheet row (header = row 1). */
  row: number;
  values: Record<RequiredColumn, RawCell>;
}

export interface ReadLimits {
  /** Maximum data rows (header excluded). */
  maxRows: number;
  /** Maximum declared uncompressed size of the archive. */
  maxUncompressedBytes: number;
}

export const DEFAULT_READ_LIMITS: ReadLimits = {
  maxRows: 10_000,
  maxUncompressedBytes: 64 * 1024 * 1024,
};

/**
 * Reads the first worksheet of an `.xlsx` buffer: header in row 1, one shift per following
 * non-empty row. Throws `ImportError` when the workbook cannot be used at all.
 */
export async function readShiftRows(
  buffer: Buffer,
  limits: Partial<ReadLimits> = {},
): Promise<RawRow[]> {
  const { maxRows, maxUncompressedBytes } = { ...DEFAULT_READ_LIMITS, ...limits };

  assertZipWithinLimits(buffer, maxUncompressedBytes);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw unreadableFile();
  }

  const sheet = workbook.worksheets[0];
  // Every real workbook has at least one worksheet; a ZIP without one is not a spreadsheet.
  if (!sheet) throw unreadableFile();
  if (sheet.actualRowCount === 0) {
    throw new ImportError(ErrorCode.EmptyFile, 'El archivo no contiene datos.');
  }

  const columns = locateColumns(sheet.getRow(1));

  const dataRows: ExcelJS.Row[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1 && rowHasContent(row)) dataRows.push(row);
  });

  if (dataRows.length === 0) {
    throw new ImportError(
      ErrorCode.EmptyFile,
      'El archivo no tiene filas de turnos debajo del encabezado.',
    );
  }
  if (dataRows.length > maxRows) {
    throw new ImportError(
      ErrorCode.TooManyRows,
      `El archivo tiene más de ${maxRows.toLocaleString('es-AR')} filas. Verifique que sea el reporte semanal de cierre de turnos.`,
      { maxRows },
    );
  }

  return dataRows.map((row) => ({
    row: row.number,
    values: Object.fromEntries(
      REQUIRED_COLUMNS.map((column) => [column, toRawCell(row.getCell(columns[column]).value)]),
    ) as Record<RequiredColumn, RawCell>,
  }));
}

function locateColumns(header: ExcelJS.Row): Record<RequiredColumn, number> {
  const positions = new Map<string, number>();
  header.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const name = String(toRawCell(cell.value) ?? '')
      .trim()
      .toLowerCase();
    // First occurrence wins if a header is repeated.
    if (name && !positions.has(name)) positions.set(name, columnNumber);
  });

  const missing = REQUIRED_COLUMNS.filter((column) => !positions.has(column));
  if (missing.length > 0) {
    throw new ImportError(
      ErrorCode.MissingColumns,
      `Faltan columnas obligatorias: ${missing.join(', ')}.`,
      { missing },
    );
  }
  return Object.fromEntries(positions) as Record<RequiredColumn, number>;
}

function rowHasContent(row: ExcelJS.Row): boolean {
  let hasContent = false;
  row.eachCell({ includeEmpty: false }, (cell) => {
    const value = toRawCell(cell.value);
    if (value !== null && !(typeof value === 'string' && value.trim() === '')) hasContent = true;
  });
  return hasContent;
}

/** Unwraps exceljs cell value objects. Error cells and unknown shapes become `null`. */
export function toRawCell(value: ExcelJS.CellValue | undefined): RawCell {
  if (value === null || value === undefined) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return value;
  }
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('');
  }
  if ('result' in value) {
    return toRawCell(value.result as ExcelJS.CellValue | undefined);
  }
  if ('hyperlink' in value && 'text' in value) {
    return toRawCell(value.text as ExcelJS.CellValue);
  }
  return null;
}
