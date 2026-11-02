import {
  type CashierTotals,
  type EligibilityReason,
  EligibilityReasonCode,
  type RankingEntry,
} from '@grido/shared';

/** Podium requirement: minimum tickets in the view's period. */
export const MIN_PODIUM_TICKETS = 30;

type Counts = Pick<CashierTotals, 'activadas' | 'aceptadas'>;

/**
 * Compares two effectiveness ratios exactly (cross-multiplication on integer counts), so equal
 * ratios are always equal. Not calculable (no activadas) sorts after any calculable value.
 * Negative when `a` is better.
 */
export function compareEffectiveness(a: Counts, b: Counts): number {
  if (a.activadas === 0 || b.activadas === 0) {
    return (a.activadas === 0 ? 1 : 0) - (b.activadas === 0 ? 1 : 0);
  }
  return b.aceptadas * a.activadas - a.aceptadas * b.activadas;
}

/**
 * Ranking comparator: effectiveness desc (not calculable last), then aceptadas desc, then
 * activadas desc. `0` means a shared position. Negative when `a` ranks better.
 */
export function compareCashiers(a: Counts, b: Counts): number {
  return compareEffectiveness(a, b) || b.aceptadas - a.aceptadas || b.activadas - a.activadas;
}

const collator = new Intl.Collator('es');

/** Display-only order inside a tie: display name (es), then key. Never changes positions. */
function compareDisplay(a: CashierTotals, b: CashierTotals): number {
  return (
    collator.compare(a.cashierName, b.cashierName) || collator.compare(a.cashierKey, b.cashierKey)
  );
}

/** Sorts best first and numbers with standard competition ranking (1, 2, 2, 4). */
export function assignPositions<T extends CashierTotals>(
  cashiers: readonly T[],
): Array<T & { position: number }> {
  const sorted = [...cashiers].sort((a, b) => compareCashiers(a, b) || compareDisplay(a, b));
  const ranked: Array<T & { position: number }> = [];
  sorted.forEach((current, index) => {
    const previous = ranked[index - 1];
    const position =
      previous && compareCashiers(previous, current) === 0 ? previous.position : index + 1;
    ranked.push({ ...current, position });
  });
  return ranked;
}

const REASON_MESSAGES: Record<EligibilityReasonCode, string> = {
  [EligibilityReasonCode.MinTickets]: `Menos de ${MIN_PODIUM_TICKETS} tickets`,
  [EligibilityReasonCode.NoAccepted]: 'Sin sobreventas aceptadas',
  [EligibilityReasonCode.NotCalculable]: 'Efectividad no calculable',
};

/** Every reason that keeps a cashier off the podium; empty when eligible. */
export function ineligibilityReasons(cashier: CashierTotals): EligibilityReason[] {
  const codes: EligibilityReasonCode[] = [];
  if (cashier.tickets < MIN_PODIUM_TICKETS) codes.push(EligibilityReasonCode.MinTickets);
  if (cashier.aceptadas < 1) codes.push(EligibilityReasonCode.NoAccepted);
  if (cashier.effectiveness === null) codes.push(EligibilityReasonCode.NotCalculable);
  return codes.map((code) => ({ code, message: REASON_MESSAGES[code] }));
}

/** Every cashier of the view, best first, with shared positions and podium eligibility. */
export function rankCashiers(cashiers: readonly CashierTotals[]): RankingEntry[] {
  return assignPositions(cashiers).map((entry) => {
    const reasons = ineligibilityReasons(entry);
    return { ...entry, eligible: reasons.length === 0, ineligibilityReasons: reasons };
  });
}
