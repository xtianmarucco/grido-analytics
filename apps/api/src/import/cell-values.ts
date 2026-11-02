import type { WallClockDateTime } from '@grido/shared';

import type { RawCell } from './read-workbook.js';

/** Pure cell parsers. Each returns `undefined` when the value is empty or invalid. */

const INTEGER_TEXT = /^-?\d+$/;
/** Plain decimal text with a dot (`1234.56`); grouped or currency text is rejected. */
const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/;
const MS_PER_DAY = 86_400_000;
/** Days between the Excel epoch (1899-12-30, 1900 system) and 1970-01-01. */
const EXCEL_EPOCH_OFFSET_DAYS = 25_569;

export function parseInteger(cell: RawCell): number | undefined {
  if (typeof cell === 'number') return Number.isSafeInteger(cell) ? cell : undefined;
  if (typeof cell === 'string' && INTEGER_TEXT.test(cell.trim())) {
    const value = Number(cell.trim());
    return Number.isSafeInteger(value) ? value : undefined;
  }
  return undefined;
}

export function parseCount(cell: RawCell): number | undefined {
  const value = parseInteger(cell);
  return value !== undefined && value >= 0 ? value : undefined;
}

export function parsePositiveInteger(cell: RawCell): number | undefined {
  const value = parseInteger(cell);
  return value !== undefined && value > 0 ? value : undefined;
}

/** Rounds to whole cents. `toPrecision(15)` first drops binary artifacts (`10.005 * 100`). */
export function toCents(value: number): number {
  return Math.round(Number((value * 100).toPrecision(15)));
}

/** A money amount in pesos rounded to cents; any sign. */
export function parseMoney(cell: RawCell): number | undefined {
  let value: number;
  if (typeof cell === 'number') value = cell;
  else if (typeof cell === 'string' && DECIMAL_TEXT.test(cell.trim())) value = Number(cell.trim());
  else return undefined;
  if (!Number.isFinite(value)) return undefined;
  const cents = toCents(value);
  // `Math.round` keeps the sign of zero; normalize `-0` so JSON and comparisons stay plain.
  return cents === 0 ? 0 : cents / 100;
}

export function parseNonNegativeMoney(cell: RawCell): number | undefined {
  const value = parseMoney(cell);
  return value !== undefined && value >= 0 ? value : undefined;
}

export function parseText(cell: RawCell): string | undefined {
  if (typeof cell === 'number' && Number.isFinite(cell)) return String(cell);
  if (typeof cell !== 'string') return undefined;
  const text = cell.trim();
  return text === '' ? undefined : text;
}

/**
 * Excel stores date-times as day serials without timezone. exceljs returns them as `Date`s whose
 * UTC fields hold the wall-clock time, so this reads UTC fields and never applies an offset.
 * Rounds to the nearest second to drop float artifacts such as `17:08:59.999`. Plain numbers are
 * read as serials too (a date cell without a date format).
 */
export function parseWallClock(cell: RawCell): WallClockDateTime | undefined {
  let millis: number;
  if (cell instanceof Date) {
    millis = cell.getTime();
  } else if (typeof cell === 'number' && cell > 0) {
    millis = (cell - EXCEL_EPOCH_OFFSET_DAYS) * MS_PER_DAY;
  } else {
    return undefined;
  }
  const date = new Date(Math.round(millis / 1000) * 1000);
  // A finite serial can still exceed the Date range; `toISOString()` would throw on it.
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 9999) return undefined;
  return date.toISOString().slice(0, 19);
}
