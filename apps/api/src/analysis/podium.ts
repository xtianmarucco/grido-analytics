import { type PodiumStep, PodiumStepStatus, type RankingEntry } from '@grido/shared';

import { assignPositions } from './ranking.js';

export type Podium = [PodiumStep, PodiumStep, PodiumStep];

/**
 * Podium of a view: eligible cashiers only, renumbered among themselves with the ranking
 * comparator. Tied cashiers share a step and use up the steps below it (`covered-by-tie`);
 * steps without enough eligible cashiers are `vacant`. Never more than three steps.
 */
export function buildPodium(ranking: readonly RankingEntry[]): Podium {
  const contenders = assignPositions(ranking.filter((entry) => entry.eligible));
  const step = (position: PodiumStep['position']): PodiumStep => {
    const cashiers = contenders.filter((c) => c.position === position);
    if (cashiers.length > 0) return { position, status: PodiumStepStatus.Filled, cashiers };
    const above = contenders.filter((c) => c.position < position).length;
    return {
      position,
      status: above >= position ? PodiumStepStatus.CoveredByTie : PodiumStepStatus.Vacant,
      cashiers: [],
    };
  };
  return [step(1), step(2), step(3)];
}
