import {
  analysisViewSchema,
  type ImportResult,
  ObservationRule,
  PodiumStepStatus,
} from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { analyzeImport } from './analyze.js';
import { shift } from './test-utils/builders.js';

const almirante = { branchCode: 1, branchName: 'Almirante' };
const barranqueras = { branchCode: 2, branchName: 'Barranqueras' };

function counts(tickets: number, activadas: number, aceptadas: number) {
  return {
    tickets,
    noActivadas: tickets - activadas,
    rechazadas: activadas - aceptadas,
    aceptadas,
  };
}

// Fictitious week: Dario works in both branches and is merged in the combined view.
const shifts = [
  shift({ ...almirante, cashierKey: 'ana', cashierName: 'Ana', ...counts(239, 212, 40) }),
  shift({ ...almirante, cashierKey: 'bruno', cashierName: 'Bruno', ...counts(180, 173, 1) }),
  shift({ ...almirante, cashierKey: 'dario', cashierName: 'Dario', ...counts(40, 34, 0) }),
  shift({ ...barranqueras, cashierKey: 'carla', cashierName: 'Carla', ...counts(300, 276, 3) }),
  shift({ ...barranqueras, cashierKey: 'eva', cashierName: 'Eva', ...counts(356, 339, 2) }),
  shift({ ...barranqueras, cashierKey: 'dario', cashierName: 'Dario', ...counts(58, 55, 0) }),
];

const result: ImportResult = {
  period: { from: '2026-10-19', to: '2026-10-25' },
  branches: [
    { code: 1, name: 'Almirante', shiftCount: 3 },
    { code: 2, name: 'Barranqueras', shiftCount: 3 },
  ],
  shifts,
  warnings: [],
  summary: { totalRows: 6, includedRows: 6, excludedRows: 0 },
};

describe('analyzeImport', () => {
  const views = analyzeImport(result);

  it('returns contract-valid views for each branch and the combined one', () => {
    expect(views.map((v) => [v.id, v.label])).toEqual([
      ['branch-1', 'Almirante'],
      ['branch-2', 'Barranqueras'],
      ['all', 'Ambas sucursales'],
    ]);
    for (const view of views) expect(analysisViewSchema.parse(view)).toEqual(view);
  });

  it('summarizes each view', () => {
    expect(
      views.map((v) => [
        v.summary.cashierCount,
        v.summary.tickets,
        v.summary.activadas,
        v.summary.aceptadas,
      ]),
    ).toEqual([
      [3, 459, 419, 41],
      [3, 714, 670, 5],
      [5, 1173, 1089, 46],
    ]);
  });

  it('merges a cashier present in both branches in the combined view', () => {
    const dario = views[2]?.ranking.find((e) => e.cashierKey === 'dario');

    expect(dario).toMatchObject({
      branchCodes: [1, 2],
      shiftCount: 2,
      tickets: 98,
      activadas: 89,
      aceptadas: 0,
    });
  });

  it('builds each podium from eligible cashiers', () => {
    const podium = (index: number) =>
      views[index]?.podium.map((s) => [s.status, s.cashiers.map((c) => c.effectiveness)]);

    expect(podium(0)).toEqual([
      [PodiumStepStatus.Filled, [(40 / 212) * 100]],
      [PodiumStepStatus.Filled, [(1 / 173) * 100]],
      [PodiumStepStatus.Vacant, []],
    ]);
    expect(podium(2)).toEqual([
      [PodiumStepStatus.Filled, [(40 / 212) * 100]],
      [PodiumStepStatus.Filled, [(3 / 276) * 100]],
      [PodiumStepStatus.Filled, [(2 / 339) * 100]],
    ]);
  });

  it('adds observations per view', () => {
    expect(views[0]?.observations.map((o) => o.rule)).toContain(ObservationRule.IncompletePodium);
    expect(views[2]?.observations.map((o) => o.rule)).not.toContain(
      ObservationRule.IncompletePodium,
    );
  });
});
