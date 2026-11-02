import { type CashierTotals, ObservationRule } from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { buildObservations } from './observations.js';
import { buildPodium } from './podium.js';
import { rankCashiers } from './ranking.js';
import { cashier } from './test-utils/builders.js';

const period = { from: '2026-10-19', to: '2026-10-25' };

function observe(cashiers: CashierTotals[], label = 'Almirante') {
  const ranking = rankCashiers(cashiers);
  const sum = (key: 'tickets' | 'activadas' | 'aceptadas') =>
    cashiers.reduce((total, c) => total + c[key], 0);
  const activadas = sum('activadas');
  const aceptadas = sum('aceptadas');
  return buildObservations({
    label,
    summary: {
      period,
      cashierCount: cashiers.length,
      shiftCount: cashiers.length,
      tickets: sum('tickets'),
      activadas,
      aceptadas,
      effectiveness: activadas === 0 ? null : (aceptadas / activadas) * 100,
    },
    ranking,
    podium: buildPodium(ranking),
  });
}

function rules(observations: ReturnType<typeof observe>, rule: string) {
  return observations.filter((o) => o.rule === rule).map((o) => o.cashierKey ?? null);
}

// Three eligible cashiers, close results, no gap, full podium: no observation except O1.
const ana = cashier('ana', { tickets: 100, activadas: 50, aceptadas: 10 }); // 20 %
const bruno = cashier('bruno', { tickets: 100, activadas: 50, aceptadas: 9 }); // 18 %
const carla = cashier('carla', { tickets: 100, activadas: 50, aceptadas: 8 }); // 16 %

describe('buildObservations: O1 top result', () => {
  it('fires for the cashier at podium position 1, with es-AR numbers', () => {
    const [top] = observe([
      cashier('ana', { tickets: 300, activadas: 212, aceptadas: 40 }),
      bruno,
      carla,
    ]);

    expect(top).toEqual({
      rule: ObservationRule.TopResult,
      cashierKey: 'ana',
      fact: 'Ana concretó 40 de 212 sobreventas activadas (18,87 %).',
      interpretation: 'Es el resultado más alto de la semana en Almirante.',
      recommendation: 'Invitar a Ana a compartir con el equipo cómo ofrece las sobreventas.',
    });
  });

  it('fires for every cashier tied at 1st', () => {
    const tied = cashier('bruno', { tickets: 100, activadas: 50, aceptadas: 10 });

    expect(rules(observe([ana, tied, carla]), ObservationRule.TopResult)).toEqual(['ana', 'bruno']);
  });

  it('does not fire without eligible cashiers', () => {
    const few = cashier('ana', { tickets: 10, activadas: 5, aceptadas: 5 });

    expect(rules(observe([few]), ObservationRule.TopResult)).toEqual([]);
  });
});

describe('buildObservations: O2 many opportunities, low conversion', () => {
  it('fires with activadas ≥ the view mean and effectiveness below the general one', () => {
    const busy = cashier('dario', { tickets: 200, activadas: 150, aceptadas: 15 }); // 10 %
    const observations = observe([ana, bruno, carla, busy]);

    expect(
      observations.find((o) => o.rule === ObservationRule.ManyOpportunitiesLowConversion),
    ).toEqual({
      rule: ObservationRule.ManyOpportunitiesLowConversion,
      cashierKey: 'dario',
      fact: 'Dario tuvo 150 oportunidades y concretó 15 (10,00 %), por debajo de la efectividad general de Almirante (14,00 %).',
      interpretation: 'Tiene muchas oportunidades y una conversión menor que la del conjunto.',
      recommendation: 'Acompañar algunos turnos junto a quien obtuvo mejores resultados.',
    });
  });

  it('does not fire below the mean activadas, or at the general effectiveness', () => {
    // carla: 50 activadas = mean, 16 % < 18 % general → fires; others are at/above general.
    expect(
      rules(observe([ana, bruno, carla]), ObservationRule.ManyOpportunitiesLowConversion),
    ).toEqual(['carla']);
    const quiet = cashier('dario', { tickets: 40, activadas: 5, aceptadas: 0 });
    expect(rules(observe([ana, quiet]), ObservationRule.ManyOpportunitiesLowConversion)).toEqual(
      [],
    );
    const same = cashier('bruno', { tickets: 100, activadas: 50, aceptadas: 10 });
    expect(rules(observe([ana, same]), ObservationRule.ManyOpportunitiesLowConversion)).toEqual([]);
  });

  it('leaves cashiers without accepted upsells to O5 only', () => {
    const none = cashier('dario', { tickets: 200, activadas: 150, aceptadas: 0 });
    const observations = observe([ana, bruno, none]);

    expect(rules(observations, ObservationRule.ManyOpportunitiesLowConversion)).toEqual([]);
    expect(rules(observations, ObservationRule.NoAccepted)).toEqual(['dario']);
  });
});

describe('buildObservations: O3 relevant gap', () => {
  it('fires when best and worst calculable effectiveness are ≥ 10 points apart', () => {
    const low = cashier('dario', { tickets: 100, activadas: 100, aceptadas: 10 }); // 10 %

    expect(observe([ana, low]).find((o) => o.rule === ObservationRule.RelevantGap)).toEqual({
      rule: ObservationRule.RelevantGap,
      fact: 'Entre el resultado más alto (20,00 %) y el más bajo (10,00 %) hay 10,00 puntos porcentuales de diferencia.',
      interpretation: 'Los resultados del equipo son dispares.',
      recommendation:
        'Compartir en una reunión breve las prácticas de quienes tienen mejores resultados.',
    });
  });

  it('does not fire just under 10 points, with one calculable cashier, or ignoring not calculable', () => {
    const almost = cashier('dario', { tickets: 100, activadas: 1000, aceptadas: 101 }); // 10,1 %
    expect(rules(observe([ana, almost]), ObservationRule.RelevantGap)).toEqual([]);
    const none = cashier('eva', { tickets: 100, activadas: 0, aceptadas: 0 });
    expect(rules(observe([ana, none]), ObservationRule.RelevantGap)).toEqual([]);
  });
});

describe('buildObservations: O4 notable with low volume', () => {
  it('fires with fewer than 30 tickets and effectiveness ≥ the general one', () => {
    const small = cashier('dario', { tickets: 29, activadas: 10, aceptadas: 5 }); // 50 %

    expect(
      observe([ana, bruno, carla, small]).find((o) => o.rule === ObservationRule.NotableLowVolume),
    ).toEqual({
      rule: ObservationRule.NotableLowVolume,
      cashierKey: 'dario',
      fact: 'Dario obtuvo 50,00 % con 29 tickets.',
      interpretation: 'Es un buen resultado, pero con poco volumen para sacar conclusiones.',
      recommendation: 'Seguir su evolución en las próximas semanas.',
    });
  });

  it('does not fire with 30 tickets, below the general effectiveness, or not calculable', () => {
    const enough = cashier('dario', { tickets: 30, activadas: 10, aceptadas: 5 });
    const weak = cashier('eva', { tickets: 10, activadas: 10, aceptadas: 1 });
    const none = cashier('fabio', { tickets: 10, activadas: 0, aceptadas: 0 });

    expect(rules(observe([ana, enough, weak, none]), ObservationRule.NotableLowVolume)).toEqual([]);
  });
});

describe('buildObservations: O5 no accepted', () => {
  it('fires with activadas and no aceptadas', () => {
    const zero = cashier('dario', { tickets: 98, activadas: 89, aceptadas: 0 });

    expect(observe([ana, zero]).find((o) => o.rule === ObservationRule.NoAccepted)).toEqual({
      rule: ObservationRule.NoAccepted,
      cashierKey: 'dario',
      fact: 'Dario tuvo 89 oportunidades y no concretó ninguna.',
      interpretation: 'Ninguna oportunidad se convirtió en venta esta semana.',
      recommendation: 'Repasar juntos cómo ofrecer el producto adicional.',
    });
  });

  it('uses the singular for one opportunity and does not fire without activadas', () => {
    const one = cashier('dario', { tickets: 40, activadas: 1, aceptadas: 0 });
    const none = cashier('eva', { tickets: 40, activadas: 0, aceptadas: 0 });
    const observations = observe([ana, one, none]);

    expect(rules(observations, ObservationRule.NoAccepted)).toEqual(['dario']);
    expect(observations.find((o) => o.rule === ObservationRule.NoAccepted)?.fact).toBe(
      'Dario tuvo 1 oportunidad y no concretó ninguna.',
    );
  });
});

describe('buildObservations: O6 incomplete podium', () => {
  it('fires when a step is vacant for lack of eligible cashiers', () => {
    expect(observe([ana, bruno]).find((o) => o.rule === ObservationRule.IncompletePodium)).toEqual({
      rule: ObservationRule.IncompletePodium,
      fact: 'Solo 2 de las 3 posiciones del podio tienen cajeros elegibles.',
      interpretation: 'Pocos cajeros cumplen los requisitos de la semana.',
      recommendation: 'Revisar los motivos de no elegibilidad en el ranking.',
    });
  });

  it('agrees in number and handles an empty podium', () => {
    const few = cashier('dario', { tickets: 10, activadas: 5, aceptadas: 1 });
    const fact = (cs: CashierTotals[]) =>
      observe(cs).find((o) => o.rule === ObservationRule.IncompletePodium)?.fact;

    expect(fact([ana])).toBe('Solo 1 de las 3 posiciones del podio tiene cajeros elegibles.');
    expect(fact([few])).toBe('Ninguna de las 3 posiciones del podio tiene cajeros elegibles.');
  });

  it('does not fire for a full podium or for steps covered by a tie', () => {
    const tied = cashier('carla', { tickets: 100, activadas: 50, aceptadas: 9 });

    expect(rules(observe([ana, bruno, carla]), ObservationRule.IncompletePodium)).toEqual([]);
    expect(rules(observe([ana, bruno, tied]), ObservationRule.IncompletePodium)).toEqual([]);
  });
});

describe('buildObservations: order and tone', () => {
  it('orders by rule, then by ranking position and display name', () => {
    const zeroA = cashier('zoe', { tickets: 40, activadas: 30, aceptadas: 0 });
    const zeroB = cashier('mia', { tickets: 40, activadas: 30, aceptadas: 0 });

    expect(observe([zeroA, ana, zeroB]).map((o) => [o.rule, o.cashierKey ?? null])).toEqual([
      [ObservationRule.TopResult, 'ana'],
      [ObservationRule.RelevantGap, null],
      [ObservationRule.NoAccepted, 'mia'],
      [ObservationRule.NoAccepted, 'zoe'],
      [ObservationRule.IncompletePodium, null],
    ]);
  });

  it('is deterministic and never attributes causes', () => {
    const cashiers = [ana, bruno, cashier('dario', { tickets: 98, activadas: 89, aceptadas: 0 })];
    const first = observe(cashiers);

    expect(observe([...cashiers].reverse())).toEqual(first);
    const text = first.flatMap((o) => [o.fact, o.interpretation, o.recommendation]).join(' ');
    expect(text).not.toMatch(/porque|por falta|culpa|debido a|técnica|actitud/i);
  });

  it('returns nothing for an empty view', () => {
    expect(observe([]).filter((o) => o.rule !== ObservationRule.IncompletePodium)).toEqual([]);
  });
});
