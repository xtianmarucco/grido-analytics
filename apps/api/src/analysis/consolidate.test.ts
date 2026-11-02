import type { ImportResult } from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { consolidateCashiers, effectiveness, summarizeView, viewScopes } from './consolidate.js';
import { shift } from './test-utils/builders.js';

const period = { from: '2026-10-19', to: '2026-10-25' };

function importOf(shifts: ImportResult['shifts']): ImportResult {
  const codes = [...new Set(shifts.map((s) => s.branchCode))].sort((a, b) => a - b);
  return {
    period,
    branches: codes.map((code) => ({
      code,
      name: shifts.find((s) => s.branchCode === code)?.branchName ?? '',
      shiftCount: shifts.filter((s) => s.branchCode === code).length,
    })),
    shifts,
    warnings: [],
    summary: { totalRows: shifts.length, includedRows: shifts.length, excludedRows: 0 },
  };
}

const almirante = { branchCode: 1, branchName: 'Almirante' };
const barranqueras = { branchCode: 2, branchName: 'Barranqueras' };

describe('effectiveness', () => {
  it('is aceptadas / activadas × 100 at full precision', () => {
    expect(effectiveness(40, 212)).toBe((40 / 212) * 100);
    expect(effectiveness(1, 3)).toBeCloseTo(33.3333333333, 9);
  });

  it('is null (not calculable) without activadas', () => {
    expect(effectiveness(0, 0)).toBeNull();
  });

  it('is 0 with activadas and no aceptadas', () => {
    expect(effectiveness(0, 12)).toBe(0);
  });
});

describe('viewScopes', () => {
  it('returns one view per branch, by code, then the combined view', () => {
    const shifts = [
      shift({ ...barranqueras, cashierKey: 'bruno' }),
      shift({ ...almirante, cashierKey: 'ana' }),
    ];

    const scopes = viewScopes(importOf(shifts));

    expect(scopes.map(({ id, label, branchCodes }) => ({ id, label, branchCodes }))).toEqual([
      { id: 'branch-1', label: 'Almirante', branchCodes: [1] },
      { id: 'branch-2', label: 'Barranqueras', branchCodes: [2] },
      { id: 'all', label: 'Ambas sucursales', branchCodes: [1, 2] },
    ]);
    expect(scopes[0]?.shifts.map((s) => s.cashierKey)).toEqual(['ana']);
    expect(scopes[1]?.shifts.map((s) => s.cashierKey)).toEqual(['bruno']);
    expect(scopes[2]?.shifts).toHaveLength(2);
  });

  it('labels the combined view of a single branch as "Todas las sucursales"', () => {
    const scopes = viewScopes(importOf([shift()]));

    expect(scopes.map((s) => [s.id, s.label])).toEqual([
      ['branch-1', 'Almirante'],
      ['all', 'Todas las sucursales'],
    ]);
  });
});

describe('consolidateCashiers', () => {
  it('sums shifts, tickets, activadas and aceptadas per cashier key', () => {
    const totals = consolidateCashiers([
      shift({ cashierKey: 'ana', tickets: 40, noActivadas: 10, rechazadas: 20, aceptadas: 10 }),
      shift({ cashierKey: 'ana', tickets: 25, noActivadas: 5, rechazadas: 18, aceptadas: 2 }),
      shift({
        cashierKey: 'bruno',
        cashierName: 'Bruno',
        tickets: 5,
        noActivadas: 5,
        rechazadas: 0,
        aceptadas: 0,
      }),
    ]);

    expect(totals).toEqual([
      {
        cashierKey: 'ana',
        cashierName: 'Ana',
        branchCodes: [1],
        shiftCount: 2,
        tickets: 65,
        activadas: 50,
        aceptadas: 12,
        effectiveness: 24,
      },
      {
        cashierKey: 'bruno',
        cashierName: 'Bruno',
        branchCodes: [1],
        shiftCount: 1,
        tickets: 5,
        activadas: 0,
        aceptadas: 0,
        effectiveness: null,
      },
    ]);
  });

  it('computes effectiveness on the totals, never averaging shift percentages', () => {
    const [ana] = consolidateCashiers([
      shift({ tickets: 10, noActivadas: 0, rechazadas: 0, aceptadas: 10 }),
      shift({ tickets: 90, noActivadas: 0, rechazadas: 90, aceptadas: 0 }),
    ]);

    expect(ana?.effectiveness).toBe(10);
  });

  it('merges a cashier across branches and lists the branches', () => {
    const [carla] = consolidateCashiers([
      shift({
        ...barranqueras,
        cashierKey: 'carla',
        cashierName: 'Carla',
        tickets: 30,
        noActivadas: 0,
        rechazadas: 30,
        aceptadas: 0,
      }),
      shift({
        ...almirante,
        cashierKey: 'carla',
        cashierName: 'Carla',
        tickets: 20,
        noActivadas: 0,
        rechazadas: 15,
        aceptadas: 5,
      }),
    ]);

    expect(carla).toMatchObject({
      branchCodes: [1, 2],
      shiftCount: 2,
      tickets: 50,
      activadas: 50,
      aceptadas: 5,
      effectiveness: 10,
    });
  });
});

describe('summarizeView', () => {
  it('totals the view and computes the general effectiveness on those totals', () => {
    const summary = summarizeView(
      [
        shift({ cashierKey: 'ana', tickets: 40, noActivadas: 10, rechazadas: 20, aceptadas: 10 }),
        shift({ cashierKey: 'ana', tickets: 20, noActivadas: 0, rechazadas: 20, aceptadas: 0 }),
        shift({ cashierKey: 'bruno', tickets: 10, noActivadas: 0, rechazadas: 8, aceptadas: 2 }),
      ],
      period,
    );

    expect(summary).toEqual({
      period,
      cashierCount: 2,
      shiftCount: 3,
      tickets: 70,
      activadas: 60,
      aceptadas: 12,
      effectiveness: 20,
    });
  });

  it('reports a not calculable general effectiveness as null', () => {
    const summary = summarizeView(
      [shift({ noActivadas: 40, rechazadas: 0, aceptadas: 0 })],
      period,
    );

    expect(summary.effectiveness).toBeNull();
  });
});
