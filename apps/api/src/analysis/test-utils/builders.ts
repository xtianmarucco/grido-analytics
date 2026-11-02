import type { CashierTotals, NormalizedShift } from '@grido/shared';

import { effectiveness } from '../consolidate.js';

/** Test-only builders. Names are fictitious. */

let nextTurno = 5000;

/** A normalized shift; `activadas` is derived from `rechazadas + aceptadas`. */
export function shift(
  overrides: Partial<Omit<NormalizedShift, 'activadas'>> = {},
): NormalizedShift {
  nextTurno += 1;
  const base = {
    row: 2,
    turno: nextTurno,
    branchCode: 1,
    branchName: 'Almirante',
    cashierKey: 'ana',
    cashierName: 'Ana',
    startedAt: '2026-10-19T08:00:00',
    closedAt: '2026-10-19T15:30:00',
    tickets: 40,
    noActivadas: 10,
    rechazadas: 20,
    aceptadas: 10,
    ...overrides,
  };
  return { ...base, activadas: base.rechazadas + base.aceptadas };
}

/** Consolidated totals for a cashier; effectiveness derived from the counts. */
export function cashier(
  key: string,
  counts: { tickets: number; activadas: number; aceptadas: number },
  overrides: Partial<Omit<CashierTotals, 'effectiveness'>> = {},
): CashierTotals {
  return {
    cashierKey: key,
    cashierName: key.charAt(0).toUpperCase() + key.slice(1),
    branchCodes: [1],
    shiftCount: 1,
    ...counts,
    effectiveness: effectiveness(counts.aceptadas, counts.activadas),
    ...overrides,
  };
}
