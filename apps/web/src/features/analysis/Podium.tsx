import type { PodiumStep } from '@grido/shared';
import { cva } from 'class-variance-authority';
import { Info, Link2, Medal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { formatOrdinal, formatPercent } from '@/lib/format';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';

/**
 * Metal per position, with the visual 2 – 1 – 3 arrangement from `md` (CSS `order` only: the DOM
 * and reading order stay 1, 2, 3). Empty steps keep the size and order but drop the metal.
 */
const stepVariants = cva('flex flex-col gap-2 rounded-xl border-2 p-4 md:p-5', {
  variants: {
    metal: {
      1: 'border-podium-gold-edge bg-podium-gold text-podium-gold-fg md:order-2 md:min-h-56',
      2: 'border-podium-silver-edge bg-podium-silver text-podium-silver-fg md:order-1 md:min-h-44 md:self-end',
      3: 'border-podium-bronze-edge bg-podium-bronze text-podium-bronze-fg md:order-3 md:min-h-40 md:self-end',
    },
    empty: {
      true: 'border-dashed border-input bg-muted text-muted-foreground',
      false: '',
    },
  },
});

function FilledStep({ step }: { step: PodiumStep }) {
  const [first] = step.cashiers;
  if (!first) return null;
  const tied = step.cashiers.length > 1;
  const ordinal = formatOrdinal(step.position);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Medal className="size-5" aria-hidden />
        <h3 className="text-sm font-semibold">{`${ordinal} puesto`}</h3>
        {tied && <Badge variant="outline">Empate</Badge>}
      </div>
      <ul className="flex flex-col gap-0.5">
        {step.cashiers.map((cashier) => (
          <li key={cashier.cashierKey} className="text-base font-semibold break-words">
            {cashier.cashierName}
          </li>
        ))}
      </ul>
      {/* Tied cashiers share effectiveness, aceptadas and activadas (BUSINESS_RULES ranking). */}
      <p className="text-2xl font-bold tabular-nums">{formatPercent(first.effectiveness)}</p>
      <p className="text-sm tabular-nums">
        {`${plural(first.aceptadas, 'aceptada', 'aceptadas')} de ${plural(first.activadas, 'activada', 'activadas')}`}
      </p>
      {tied && (
        <p className="text-sm">{`Comparten el ${ordinal} puesto con el mismo resultado.`}</p>
      )}
    </>
  );
}

function EmptyStep({
  step,
  coveringPosition,
}: {
  step: PodiumStep;
  coveringPosition: number | undefined;
}) {
  const ordinal = formatOrdinal(step.position);
  const covered = step.status === 'covered-by-tie';
  const Icon = covered ? Link2 : Info;

  return (
    <>
      <div className="flex items-center gap-2">
        <Icon className="size-5" aria-hidden />
        <h3 className="text-sm font-semibold">{`${ordinal} puesto`}</h3>
      </div>
      <p className="text-sm">
        {covered
          ? `Sin ${ordinal} puesto: el empate en el ${formatOrdinal(coveringPosition ?? 1)} puesto ocupa este lugar.`
          : 'Puesto vacante: no hay suficientes cajeros que cumplan los requisitos del podio.'}
      </p>
    </>
  );
}

/** Presentational: the API podium (guide §7.3). Statuses come from the API, never derived. */
export function Podium({ steps }: { steps: readonly PodiumStep[] }) {
  return (
    <section aria-labelledby="podium-title" className="flex flex-col gap-3">
      <h2 id="podium-title" className="text-lg font-semibold">
        Podio
      </h2>
      <ol aria-labelledby="podium-title" className="grid gap-3 md:grid-cols-3 md:items-end">
        {steps.map((step) => {
          const filled = step.status === 'filled';
          // The tie that uses up this step is the nearest filled step above it.
          const coveringPosition = steps
            .filter((other) => other.status === 'filled' && other.position < step.position)
            .at(-1)?.position;
          return (
            <li
              key={step.position}
              className={cn(stepVariants({ metal: step.position, empty: !filled }))}
            >
              {filled ? (
                <FilledStep step={step} />
              ) : (
                <EmptyStep step={step} coveringPosition={coveringPosition} />
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Requisitos: al menos 30 tickets, una sobreventa aceptada y efectividad calculable.
      </p>
    </section>
  );
}
