import type { AnalysisView, ImportResult } from '@grido/shared';

import { buildCashControl } from './cash-control.js';
import { consolidateCashiers, summarizeView, viewScopes } from './consolidate.js';
import { buildObservations } from './observations.js';
import { buildPodium } from './podium.js';
import { rankCashiers } from './ranking.js';

/** Entry point of the analysis: normalized shifts → one view per branch plus the combined one. */
export function analyzeImport(result: ImportResult): AnalysisView[] {
  return viewScopes(result).map(({ id, label, branchCodes, shifts }) => {
    const summary = summarizeView(shifts, result.period);
    const ranking = rankCashiers(consolidateCashiers(shifts));
    const podium = buildPodium(ranking);
    const observations = buildObservations({ label, summary, ranking, podium });
    const cashControl = buildCashControl(shifts);
    return { id, label, branchCodes, summary, ranking, podium, observations, cashControl };
  });
}
