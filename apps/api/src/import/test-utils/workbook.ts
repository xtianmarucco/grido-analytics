import { crc32 } from 'node:zlib';

import ExcelJS from 'exceljs';

/** Test-only builders. Names are fictitious; real files never enter the repository. */

export const SHIFT_HEADERS = [
  'succodigo',
  'sucursal',
  'sucdescrip',
  'turno',
  'caja',
  'usulogin',
  'turiniciaturno',
  'turcierre',
  'totaltiquets',
  'sv_noactivada',
  'sv_rechazada',
  'sv_aceptada',
  'venta',
  'turefectivo',
  'turdiferencia',
  'ventaclubgrido',
  'desde',
  'hasta',
] as const;

export type SheetRow = Record<string, ExcelJS.CellValue>;

/** Wall-clock time as exceljs represents an Excel date: a `Date` whose UTC fields are the time. */
export function excelDate(isoWallClock: string): Date {
  return new Date(`${isoWallClock}Z`);
}

let nextTurno = 1000;

/** A valid shift row; override any column. Counts satisfy the ticket invariant. */
export function shiftRow(overrides: SheetRow = {}): SheetRow {
  nextTurno += 1;
  return {
    succodigo: 'Almirante',
    sucursal: 1,
    sucdescrip: 'TODAS',
    turno: nextTurno,
    caja: 1,
    usulogin: 'ana',
    turiniciaturno: excelDate('2026-10-19T08:00:00'),
    turcierre: excelDate('2026-10-19T15:30:00'),
    totaltiquets: 40,
    sv_noactivada: 10,
    sv_rechazada: 20,
    sv_aceptada: 10,
    venta: 123456.78,
    turefectivo: 50000,
    turdiferencia: 0,
    ventaclubgrido: 60000,
    desde: excelDate('2026-10-19T00:00:00'),
    hasta: excelDate('2026-10-25T00:00:00'),
    ...overrides,
  };
}

export interface SheetSpec {
  name?: string;
  /** Header row (row 1). Defaults to `SHIFT_HEADERS`. */
  headers?: readonly string[];
  /** Data rows keyed by header name, or `null` for an empty sheet row. */
  rows?: ReadonlyArray<SheetRow | null>;
}

/** Builds an in-memory `.xlsx`. Pass several sheets to test that only the first one is read. */
export async function buildWorkbook(...sheets: SheetSpec[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  sheets.forEach((spec, index) => {
    const sheet = workbook.addWorksheet(spec.name ?? `Hoja${index + 1}`);
    const headers = spec.headers ?? SHIFT_HEADERS;
    headers.forEach((header, columnIndex) => {
      sheet.getRow(1).getCell(columnIndex + 1).value = header;
    });
    (spec.rows ?? []).forEach((row, rowIndex) => {
      if (row === null) return;
      const excelRow = sheet.getRow(rowIndex + 2);
      headers.forEach((header, columnIndex) => {
        const value = row[header];
        if (value !== undefined) excelRow.getCell(columnIndex + 1).value = value;
      });
    });
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Builds a "stored" (uncompressed) ZIP. `declaredSize` lets a test lie about entry sizes. */
export function buildZip(
  entries: ReadonlyArray<{ name: string; content: string; declaredSize?: number }>,
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = Buffer.from(entry.content);
    const size = entry.declaredSize ?? data.length;
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}
