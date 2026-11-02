import type {
  CashierTotals,
  Effectiveness,
  ImportResult,
  NormalizedShift,
  ViewSummary,
} from '@grido/shared';

/** The shifts of one analysis view, before any business rule is applied. */
export interface ViewScope {
  id: string;
  label: string;
  branchCodes: number[];
  shifts: NormalizedShift[];
}

/** `aceptadas / activadas × 100` at full precision; `null` ("No calculable") without activadas. */
export function effectiveness(aceptadas: number, activadas: number): Effectiveness {
  return activadas === 0 ? null : (aceptadas / activadas) * 100;
}

/** One view per imported branch (by code), then the combined view of every branch. */
export function viewScopes(result: ImportResult): ViewScope[] {
  const branches = [...result.branches].sort((a, b) => a.code - b.code);
  const perBranch = branches.map((branch) => ({
    id: `branch-${branch.code}`,
    label: branch.name,
    branchCodes: [branch.code],
    shifts: result.shifts.filter((s) => s.branchCode === branch.code),
  }));
  const combined = {
    id: 'all',
    label: branches.length === 2 ? 'Ambas sucursales' : 'Todas las sucursales',
    branchCodes: branches.map((b) => b.code),
    shifts: [...result.shifts],
  };
  return [...perBranch, combined];
}

/**
 * Sums each cashier's shifts (identity: `cashierKey`), then computes effectiveness on the
 * totals. Sorted by `cashierKey`; the ranking decides the display order.
 */
export function consolidateCashiers(shifts: readonly NormalizedShift[]): CashierTotals[] {
  const groups = new Map<
    string,
    { totals: Omit<CashierTotals, 'effectiveness' | 'branchCodes'>; branches: Set<number> }
  >();
  for (const s of shifts) {
    const group = groups.get(s.cashierKey);
    if (group) {
      group.totals.shiftCount += 1;
      group.totals.tickets += s.tickets;
      group.totals.activadas += s.activadas;
      group.totals.aceptadas += s.aceptadas;
      group.branches.add(s.branchCode);
    } else {
      groups.set(s.cashierKey, {
        totals: {
          cashierKey: s.cashierKey,
          cashierName: s.cashierName,
          shiftCount: 1,
          tickets: s.tickets,
          activadas: s.activadas,
          aceptadas: s.aceptadas,
        },
        branches: new Set([s.branchCode]),
      });
    }
  }
  return [...groups.values()]
    .map(({ totals, branches }) => ({
      ...totals,
      branchCodes: [...branches].sort((a, b) => a - b),
      effectiveness: effectiveness(totals.aceptadas, totals.activadas),
    }))
    .sort((a, b) => (a.cashierKey < b.cashierKey ? -1 : a.cashierKey > b.cashierKey ? 1 : 0));
}

/** View totals; the general effectiveness is computed on them, never averaged. */
export function summarizeView(
  shifts: readonly NormalizedShift[],
  period: ImportResult['period'],
): ViewSummary {
  let tickets = 0;
  let activadas = 0;
  let aceptadas = 0;
  for (const s of shifts) {
    tickets += s.tickets;
    activadas += s.activadas;
    aceptadas += s.aceptadas;
  }
  return {
    period,
    cashierCount: new Set(shifts.map((s) => s.cashierKey)).size,
    shiftCount: shifts.length,
    tickets,
    activadas,
    aceptadas,
    effectiveness: effectiveness(aceptadas, activadas),
  };
}
