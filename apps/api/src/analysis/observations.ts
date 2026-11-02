import {
  type Observation,
  ObservationRule,
  PodiumStepStatus,
  type RankingEntry,
  type ViewSummary,
} from '@grido/shared';

import type { Podium } from './podium.js';
import { compareEffectiveness, MIN_PODIUM_TICKETS } from './ranking.js';

/** O3 threshold, in percentage points. */
export const RELEVANT_GAP_POINTS = 10;

export interface ObservationInput {
  /** View label, used in the texts. */
  label: string;
  summary: ViewSummary;
  /** Ranking order (best first, ties by display name). */
  ranking: readonly RankingEntry[];
  podium: Podium;
}

const decimal = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

const percent = (value: number) => `${decimal.format(value)} %`;
const opportunities = (n: number) =>
  `${integer.format(n)} ${n === 1 ? 'oportunidad' : 'oportunidades'}`;

const RULE_ORDER = Object.values(ObservationRule);

/**
 * Deterministic observations O1–O6 (docs/BUSINESS_RULES.md). Neutral Spanish texts: facts are
 * numbers, interpretations are cautious and never attribute causes. Ordered by rule, then by
 * ranking order.
 */
export function buildObservations({
  label,
  summary,
  ranking,
  podium,
}: ObservationInput): Observation[] {
  const observations: Observation[] = [
    ...topResult(podium, label),
    ...manyOpportunitiesLowConversion(ranking, summary, label),
    ...relevantGap(ranking),
    ...notableLowVolume(ranking, summary),
    ...noAccepted(ranking),
    ...incompletePodium(podium),
  ];
  return observations.sort((a, b) => RULE_ORDER.indexOf(a.rule) - RULE_ORDER.indexOf(b.rule));
}

/** O1: every cashier on podium step 1. */
function topResult(podium: Podium, label: string): Observation[] {
  const [first] = podium;
  const shared = first.cashiers.length > 1;
  return first.cashiers.map((c) => ({
    rule: ObservationRule.TopResult,
    cashierKey: c.cashierKey,
    fact: `${c.cashierName} concretó ${integer.format(c.aceptadas)} de ${integer.format(c.activadas)} sobreventas activadas (${percent(c.effectiveness ?? 0)}).`,
    interpretation: `${shared ? 'Comparte' : 'Es'} el resultado más alto de la semana en ${label}.`,
    recommendation: `Invitar a ${c.cashierName} a compartir con el equipo cómo ofrece las sobreventas.`,
  }));
}

/** O2: activadas ≥ the view's mean per cashier and effectiveness below the general one. */
function manyOpportunitiesLowConversion(
  ranking: readonly RankingEntry[],
  summary: ViewSummary,
  label: string,
): Observation[] {
  if (summary.effectiveness === null) return [];
  const general = summary.effectiveness;
  return ranking
    .filter(
      (c) =>
        c.activadas > 0 &&
        c.activadas * ranking.length >= summary.activadas &&
        compareEffectiveness(c, summary) > 0,
    )
    .map((c) => ({
      rule: ObservationRule.ManyOpportunitiesLowConversion,
      cashierKey: c.cashierKey,
      fact: `${c.cashierName} tuvo ${opportunities(c.activadas)} y concretó ${integer.format(c.aceptadas)} (${percent(c.effectiveness ?? 0)}), por debajo de la efectividad general de ${label} (${percent(general)}).`,
      interpretation: 'Tiene muchas oportunidades y una conversión menor que la del conjunto.',
      recommendation: 'Acompañar algunos turnos junto a quien obtuvo mejores resultados.',
    }));
}

/** O3: best − worst calculable effectiveness ≥ 10 points (exact integer arithmetic). */
function relevantGap(ranking: readonly RankingEntry[]): Observation[] {
  const calculable = ranking.filter((c) => c.activadas > 0);
  const best = calculable[0];
  const worst = calculable.at(-1);
  if (!best || !worst || calculable.length < 2) return [];
  // best/worst ratios: (b.ace/b.act − w.ace/w.act) × 100 ≥ GAP ⇔ (b.ace·w.act − w.ace·b.act)·100 ≥ GAP·b.act·w.act
  const gap = (best.aceptadas * worst.activadas - worst.aceptadas * best.activadas) * 100;
  if (gap < RELEVANT_GAP_POINTS * best.activadas * worst.activadas) return [];
  const high = best.effectiveness ?? 0;
  const low = worst.effectiveness ?? 0;
  return [
    {
      rule: ObservationRule.RelevantGap,
      fact: `Entre el resultado más alto (${percent(high)}) y el más bajo (${percent(low)}) hay ${decimal.format(high - low)} puntos porcentuales de diferencia.`,
      interpretation: 'Los resultados del equipo son dispares.',
      recommendation:
        'Compartir en una reunión breve las prácticas de quienes tienen mejores resultados.',
    },
  ];
}

/** O4: fewer than 30 tickets with effectiveness ≥ the general one. */
function notableLowVolume(ranking: readonly RankingEntry[], summary: ViewSummary): Observation[] {
  if (summary.effectiveness === null) return [];
  return ranking
    .filter(
      (c) =>
        c.tickets < MIN_PODIUM_TICKETS && c.activadas > 0 && compareEffectiveness(c, summary) <= 0,
    )
    .map((c) => ({
      rule: ObservationRule.NotableLowVolume,
      cashierKey: c.cashierKey,
      fact: `${c.cashierName} obtuvo ${percent(c.effectiveness ?? 0)} con ${integer.format(c.tickets)} tickets.`,
      interpretation: 'Es un buen resultado, pero con poco volumen para sacar conclusiones.',
      recommendation: 'Seguir su evolución en las próximas semanas.',
    }));
}

/** O5: activadas without any aceptada. */
function noAccepted(ranking: readonly RankingEntry[]): Observation[] {
  return ranking
    .filter((c) => c.activadas > 0 && c.aceptadas === 0)
    .map((c) => ({
      rule: ObservationRule.NoAccepted,
      cashierKey: c.cashierKey,
      fact: `${c.cashierName} tuvo ${opportunities(c.activadas)} y no concretó ninguna.`,
      interpretation: 'Ninguna oportunidad se convirtió en venta esta semana.',
      recommendation: 'Repasar juntos cómo ofrecer el producto adicional.',
    }));
}

/** O6: steps vacant for lack of eligible cashiers (steps covered by a tie do not count). */
function incompletePodium(podium: Podium): Observation[] {
  const vacant = podium.filter((s) => s.status === PodiumStepStatus.Vacant).length;
  if (vacant === 0) return [];
  const held = podium.length - vacant;
  return [
    {
      rule: ObservationRule.IncompletePodium,
      fact:
        held === 0
          ? 'Ninguna de las 3 posiciones del podio tiene cajeros elegibles.'
          : `Solo ${held} de las 3 posiciones del podio ${held === 1 ? 'tiene' : 'tienen'} cajeros elegibles.`,
      interpretation: 'Pocos cajeros cumplen los requisitos de la semana.',
      recommendation: 'Revisar los motivos de no elegibilidad en el ranking.',
    },
  ];
}
