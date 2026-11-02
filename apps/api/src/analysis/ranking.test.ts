import { EligibilityReasonCode } from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { compareCashiers, ineligibilityReasons, rankCashiers } from './ranking.js';
import { cashier } from './test-utils/builders.js';

function positions(entries: ReturnType<typeof rankCashiers>) {
  return entries.map((e) => [e.cashierKey, e.position]);
}

describe('compareCashiers', () => {
  it('orders by effectiveness descending', () => {
    const high = cashier('ana', { tickets: 40, activadas: 10, aceptadas: 5 });
    const low = cashier('bruno', { tickets: 40, activadas: 10, aceptadas: 1 });

    expect(compareCashiers(high, low)).toBeLessThan(0);
    expect(compareCashiers(low, high)).toBeGreaterThan(0);
  });

  it('breaks an effectiveness tie by aceptadas, then activadas, descending', () => {
    const more = cashier('ana', { tickets: 40, activadas: 20, aceptadas: 10 });
    const fewer = cashier('bruno', { tickets: 40, activadas: 10, aceptadas: 5 });

    expect(compareCashiers(more, fewer)).toBeLessThan(0);
  });

  it('treats equal ratios as equal effectiveness (no float drift)', () => {
    const a = cashier('ana', { tickets: 40, activadas: 30, aceptadas: 10 });
    const b = cashier('bruno', { tickets: 40, activadas: 30, aceptadas: 10 });

    expect(compareCashiers(a, b)).toBe(0);
  });

  it('places not calculable cashiers after any calculable one, even at 0 %', () => {
    const zero = cashier('ana', { tickets: 40, activadas: 10, aceptadas: 0 });
    const none = cashier('bruno', { tickets: 40, activadas: 0, aceptadas: 0 });

    expect(compareCashiers(zero, none)).toBeLessThan(0);
  });
});

describe('rankCashiers', () => {
  it('numbers ties with standard competition ranking (1, 2, 2, 4)', () => {
    const ranking = rankCashiers([
      cashier('dario', { tickets: 40, activadas: 10, aceptadas: 1 }),
      cashier('carla', { tickets: 40, activadas: 10, aceptadas: 3 }),
      cashier('bruno', { tickets: 40, activadas: 10, aceptadas: 3 }),
      cashier('ana', { tickets: 40, activadas: 10, aceptadas: 5 }),
    ]);

    expect(positions(ranking)).toEqual([
      ['ana', 1],
      ['bruno', 2],
      ['carla', 2],
      ['dario', 4],
    ]);
  });

  it('keeps cashiers with equal effectiveness but different aceptadas apart', () => {
    const ranking = rankCashiers([
      cashier('ana', { tickets: 40, activadas: 10, aceptadas: 5 }),
      cashier('bruno', { tickets: 40, activadas: 20, aceptadas: 10 }),
    ]);

    expect(positions(ranking)).toEqual([
      ['bruno', 1],
      ['ana', 2],
    ]);
  });

  it('ranks not calculable cashiers last, sharing the last position', () => {
    const ranking = rankCashiers([
      cashier('eva', { tickets: 3, activadas: 0, aceptadas: 0 }),
      cashier('ana', { tickets: 40, activadas: 10, aceptadas: 0 }),
      cashier('dario', { tickets: 50, activadas: 0, aceptadas: 0 }),
    ]);

    expect(positions(ranking)).toEqual([
      ['ana', 1],
      ['dario', 2],
      ['eva', 2],
    ]);
    expect(ranking[1]?.effectiveness).toBeNull();
  });

  it('orders a tie by display name (es), for display only', () => {
    const counts = { tickets: 40, activadas: 10, aceptadas: 3 };
    const ranking = rankCashiers([
      cashier('zoe', counts),
      cashier('ñandu', counts, { cashierName: 'Ñandu' }),
      cashier('nora', counts),
    ]);

    expect(ranking.map((e) => [e.cashierName, e.position])).toEqual([
      ['Nora', 1],
      ['Ñandu', 1],
      ['Zoe', 1],
    ]);
  });

  it('marks eligibility and keeps ineligible cashiers in the ranking', () => {
    const ranking = rankCashiers([
      cashier('ana', { tickets: 30, activadas: 10, aceptadas: 1 }),
      cashier('bruno', { tickets: 29, activadas: 10, aceptadas: 9 }),
    ]);

    expect(
      ranking.map((e) => [e.cashierKey, e.eligible, e.ineligibilityReasons.map((r) => r.code)]),
    ).toEqual([
      ['bruno', false, [EligibilityReasonCode.MinTickets]],
      ['ana', true, []],
    ]);
  });

  it('returns an empty ranking for no cashiers', () => {
    expect(rankCashiers([])).toEqual([]);
  });
});

describe('ineligibilityReasons', () => {
  it('is empty with 30 tickets, one aceptada and calculable effectiveness', () => {
    expect(
      ineligibilityReasons(cashier('ana', { tickets: 30, activadas: 1, aceptadas: 1 })),
    ).toEqual([]);
  });

  it('flags fewer than 30 tickets', () => {
    expect(
      ineligibilityReasons(cashier('ana', { tickets: 29, activadas: 5, aceptadas: 2 })),
    ).toEqual([{ code: EligibilityReasonCode.MinTickets, message: 'Menos de 30 tickets' }]);
  });

  it('flags no aceptadas even with enough tickets', () => {
    expect(
      ineligibilityReasons(cashier('ana', { tickets: 80, activadas: 40, aceptadas: 0 })),
    ).toEqual([{ code: EligibilityReasonCode.NoAccepted, message: 'Sin sobreventas aceptadas' }]);
  });

  it('lists every applicable reason', () => {
    expect(
      ineligibilityReasons(cashier('ana', { tickets: 5, activadas: 0, aceptadas: 0 })).map(
        (r) => r.code,
      ),
    ).toEqual([
      EligibilityReasonCode.MinTickets,
      EligibilityReasonCode.NoAccepted,
      EligibilityReasonCode.NotCalculable,
    ]);
  });
});
