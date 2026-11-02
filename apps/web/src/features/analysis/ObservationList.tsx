import type { Observation, ObservationRule, RankingEntry } from '@grido/shared';
import { cva } from 'class-variance-authority';
import {
  ArrowLeftRight,
  ArrowRight,
  CircleDashed,
  Info,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

type Tone = 'gold' | 'info' | 'success' | 'neutral';

/** Web titles, icons and tones per rule (guide §7.5). None uses the destructive red. */
const RULES: Record<ObservationRule, { title: string; icon: typeof Info; tone: Tone }> = {
  O1: { title: 'Mejor resultado', icon: Trophy, tone: 'gold' },
  O2: { title: 'Muchas oportunidades', icon: Target, tone: 'info' },
  O3: { title: 'Diferencia entre resultados', icon: ArrowLeftRight, tone: 'info' },
  O4: { title: 'Buen resultado con poco volumen', icon: Sparkles, tone: 'success' },
  O5: { title: 'Sin sobreventas aceptadas', icon: CircleDashed, tone: 'neutral' },
  O6: { title: 'Podio incompleto', icon: Info, tone: 'neutral' },
};

const cardVariants = cva(
  'flex flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 shadow-xs md:p-5',
  {
    variants: {
      tone: {
        gold: 'border-l-podium-gold-edge',
        info: 'border-l-info',
        success: 'border-l-success',
        neutral: 'border-l-input',
      },
    },
  },
);

const iconVariants = cva('size-5 shrink-0', {
  variants: {
    tone: {
      gold: 'text-podium-gold-edge',
      info: 'text-info',
      success: 'text-success',
      neutral: 'text-muted-foreground',
    },
  },
});

export interface ObservationListProps {
  /** API observations, in API order. Texts are shown as-is. */
  observations: readonly Observation[];
  /** The view ranking, only to show the cashier name of a cashier observation. */
  ranking: readonly RankingEntry[];
}

/** Presentational: deterministic observations from the API (guide §7.5). */
export function ObservationList({ observations, ranking }: ObservationListProps) {
  const nameOf = (key: string | undefined) =>
    ranking.find((entry) => entry.cashierKey === key)?.cashierName;

  return (
    <section aria-labelledby="observations-title" className="flex flex-col gap-3">
      <h2 id="observations-title" className="text-lg font-semibold">
        Observaciones
      </h2>
      {observations.length === 0 ? (
        <p className="rounded-xl border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          No hay observaciones para esta vista.
        </p>
      ) : (
        <ul aria-labelledby="observations-title" className="flex flex-col gap-3">
          {observations.map((observation, index) => {
            const { title, icon: Icon, tone } = RULES[observation.rule];
            const name = nameOf(observation.cashierKey);
            return (
              <li
                key={`${observation.rule}-${observation.cashierKey ?? ''}-${index}`}
                className={cardVariants({ tone })}
              >
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Icon className={iconVariants({ tone })} aria-hidden />
                  {name ? `${name} · ${title}` : title}
                </h3>
                <dl className="grid gap-x-4 gap-y-2 text-sm md:grid-cols-[9rem_1fr]">
                  <dt className="font-medium text-foreground">Dato</dt>
                  <dd className="font-medium text-foreground">{observation.fact}</dd>
                  <dt className="text-muted-foreground">Interpretación</dt>
                  <dd className="text-muted-foreground">{observation.interpretation}</dd>
                  <dt className="flex items-center gap-1 font-medium text-accent-foreground">
                    <ArrowRight className="size-4" aria-hidden />
                    Recomendación
                  </dt>
                  <dd className="rounded-md bg-accent px-3 py-2 text-accent-foreground md:px-3">
                    {observation.recommendation}
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
