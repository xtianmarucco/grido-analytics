import type { WallClockDateTime } from './analysis.js';

/** Spanish weekday abbreviations, lowercase without dot, indexed like `Date#getUTCDay` (0 = Sunday). */
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;

/**
 * A shift start for display: `2026-10-19T13:38:00` → `lun 19/10 13:38`. Pure string work on the
 * wall-clock value; the weekday comes from the Y-M-D alone through UTC date math, so no
 * timezone can shift it (D-18).
 */
export function formatShiftStart(startedAt: WallClockDateTime): string {
  const year = Number(startedAt.slice(0, 4));
  const month = Number(startedAt.slice(5, 7));
  const day = Number(startedAt.slice(8, 10));
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${startedAt.slice(8, 10)}/${startedAt.slice(5, 7)} ${startedAt.slice(11, 16)}`;
}

/** Shift starts joined with ` · `, in the given order: `lun 19/10 10:59 · mié 21/10 10:57`. */
export function formatShiftStarts(shifts: readonly { startedAt: WallClockDateTime }[]): string {
  return shifts.map((s) => formatShiftStart(s.startedAt)).join(' · ');
}
