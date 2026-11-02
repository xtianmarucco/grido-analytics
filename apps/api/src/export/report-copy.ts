import { type ObservationRule, type PodiumStep, PodiumStepStatus } from '@grido/shared';

import { formatOrdinal } from './format.js';

/** Spanish copy shared by the PDF and Excel reports. Same wording as the dashboard. */

export const REPORT_TITLE = 'Informe semanal de sobreventas';

export const PODIUM_REQUIREMENTS =
  'Requisitos: al menos 30 tickets, una sobreventa aceptada y efectividad calculable.';

export const VACANT_STEP_TEXT =
  'Puesto vacante: no hay suficientes cajeros que cumplan los requisitos del podio.';

export const OBSERVATION_TITLES: Record<ObservationRule, string> = {
  O1: 'Mejor resultado',
  O2: 'Muchas oportunidades',
  O3: 'Diferencia entre resultados',
  O4: 'Buen resultado con poco volumen',
  O5: 'Sin sobreventas aceptadas',
  O6: 'Podio incompleto',
};

/** The tie that uses up a step is the nearest filled step above it. */
function coveringPosition(step: PodiumStep, steps: readonly PodiumStep[]): number {
  return (
    steps
      .filter((other) => other.status === PodiumStepStatus.Filled && other.position < step.position)
      .at(-1)?.position ?? 1
  );
}

/** Explanation of a step without cashiers (`vacant` or `covered-by-tie`). */
export function emptyStepText(step: PodiumStep, steps: readonly PodiumStep[]): string {
  if (step.status === PodiumStepStatus.CoveredByTie) {
    const ordinal = formatOrdinal(step.position);
    return `Sin ${ordinal} puesto: el empate en el ${formatOrdinal(coveringPosition(step, steps))} puesto ocupa este lugar.`;
  }
  return VACANT_STEP_TEXT;
}

/** Short status of a podium step for tables. */
export function podiumStatusLabel(step: PodiumStep): string {
  switch (step.status) {
    case PodiumStepStatus.Filled:
      return step.cashiers.length > 1 ? 'Empate' : 'Ocupado';
    case PodiumStepStatus.CoveredByTie:
      return 'Sin puesto por empate';
    case PodiumStepStatus.Vacant:
      return 'Vacante';
  }
}
