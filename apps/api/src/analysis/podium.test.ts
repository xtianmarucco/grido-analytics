import { PodiumStepStatus } from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { buildPodium } from './podium.js';
import { rankCashiers } from './ranking.js';
import { cashier } from './test-utils/builders.js';

const { Filled, CoveredByTie, Vacant } = PodiumStepStatus;

function podiumOf(...cashiers: Parameters<typeof rankCashiers>[0]) {
  return buildPodium(rankCashiers(cashiers)).map((step) => ({
    position: step.position,
    status: step.status,
    cashiers: step.cashiers.map((c) => [c.cashierKey, c.position]),
  }));
}

const eligible = (key: string, aceptadas: number) =>
  cashier(key, { tickets: 40, activadas: 20, aceptadas });

describe('buildPodium', () => {
  it('fills three steps with the top three eligible cashiers', () => {
    expect(
      podiumOf(
        eligible('dario', 1),
        eligible('carla', 2),
        eligible('bruno', 3),
        eligible('ana', 4),
      ),
    ).toEqual([
      { position: 1, status: Filled, cashiers: [['ana', 1]] },
      { position: 2, status: Filled, cashiers: [['bruno', 2]] },
      { position: 3, status: Filled, cashiers: [['carla', 3]] },
    ]);
  });

  it('skips ineligible cashiers and renumbers among the eligible', () => {
    const lowVolume = cashier('ana', { tickets: 29, activadas: 20, aceptadas: 20 });
    const noAccepted = cashier('bruno', { tickets: 90, activadas: 20, aceptadas: 0 });
    const notCalculable = cashier('carla', { tickets: 90, activadas: 0, aceptadas: 0 });

    expect(
      podiumOf(lowVolume, noAccepted, notCalculable, eligible('dario', 2), eligible('eva', 1)),
    ).toEqual([
      { position: 1, status: Filled, cashiers: [['dario', 1]] },
      { position: 2, status: Filled, cashiers: [['eva', 2]] },
      { position: 3, status: Vacant, cashiers: [] },
    ]);
  });

  it('requires both 30 tickets and one aceptada (boundary)', () => {
    const exactly = cashier('ana', { tickets: 30, activadas: 1, aceptadas: 1 });

    expect(podiumOf(exactly)[0]).toEqual({ position: 1, status: Filled, cashiers: [['ana', 1]] });
  });

  it('shows every step vacant without eligible cashiers', () => {
    const steps = podiumOf(cashier('ana', { tickets: 10, activadas: 5, aceptadas: 1 }));

    expect(steps.map((s) => s.status)).toEqual([Vacant, Vacant, Vacant]);
  });

  it('puts tied cashiers on one step and never enlarges the podium (two tied at 2nd)', () => {
    expect(
      podiumOf(
        eligible('ana', 5),
        eligible('bruno', 3),
        eligible('carla', 3),
        eligible('dario', 1),
      ),
    ).toEqual([
      { position: 1, status: Filled, cashiers: [['ana', 1]] },
      {
        position: 2,
        status: Filled,
        cashiers: [
          ['bruno', 2],
          ['carla', 2],
        ],
      },
      { position: 3, status: CoveredByTie, cashiers: [] },
    ]);
  });

  it('three tied at 1st cover the 2nd and 3rd steps', () => {
    expect(
      podiumOf(
        eligible('ana', 5),
        eligible('bruno', 5),
        eligible('carla', 5),
        eligible('dario', 1),
      ),
    ).toEqual([
      {
        position: 1,
        status: Filled,
        cashiers: [
          ['ana', 1],
          ['bruno', 1],
          ['carla', 1],
        ],
      },
      { position: 2, status: CoveredByTie, cashiers: [] },
      { position: 3, status: CoveredByTie, cashiers: [] },
    ]);
  });

  it('keeps every cashier tied at 3rd', () => {
    const steps = podiumOf(
      eligible('ana', 5),
      eligible('bruno', 4),
      eligible('carla', 3),
      eligible('dario', 3),
    );

    expect(steps[2]).toEqual({
      position: 3,
      status: Filled,
      cashiers: [
        ['carla', 3],
        ['dario', 3],
      ],
    });
  });

  it('two tied at 1st with no third eligible: 2nd covered by tie, 3rd vacant', () => {
    expect(podiumOf(eligible('ana', 5), eligible('bruno', 5)).map((s) => s.status)).toEqual([
      Filled,
      CoveredByTie,
      Vacant,
    ]);
  });
});
