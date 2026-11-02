import type { ViewSummary } from '@grido/shared';
import { Calendar, Percent, Receipt, CheckCircle2, Users, Zap } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { formatInteger, formatPercent, formatPeriod } from '@/lib/format';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  figure: ReactNode;
  caption?: string;
  /** Muted, smaller figure for "No calculable". */
  quiet?: boolean;
  /** The period does not fit the large figure size. */
  small?: boolean;
}

function SummaryCard({ title, icon: Icon, figure, caption, quiet, small }: SummaryCardProps) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs md:p-5">
      <div className="flex items-start gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>
      <p
        className={cn(
          'font-semibold tabular-nums',
          small && 'text-base',
          quiet && 'text-lg text-muted-foreground md:text-xl',
          !small && !quiet && 'text-2xl whitespace-nowrap md:text-3xl',
        )}
      >
        {figure}
      </p>
      {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
    </li>
  );
}

/** Presentational: the view totals as returned by the API (guide §7.2). */
export function SummaryCards({ summary }: { summary: ViewSummary }) {
  const [from, to] = formatPeriod(summary.period).split(' – ');

  return (
    <ul
      aria-label="Resumen de la vista"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6"
    >
      <SummaryCard
        title="Período"
        icon={Calendar}
        small
        figure={
          <>
            <span className="whitespace-nowrap">{from} –</span>{' '}
            <span className="whitespace-nowrap">{to}</span>
          </>
        }
      />
      <SummaryCard title="Tickets" icon={Receipt} figure={formatInteger(summary.tickets)} />
      <SummaryCard
        title="Sobreventas activadas"
        icon={Zap}
        figure={formatInteger(summary.activadas)}
      />
      <SummaryCard
        title="Sobreventas aceptadas"
        icon={CheckCircle2}
        figure={formatInteger(summary.aceptadas)}
      />
      <SummaryCard
        title="Efectividad general"
        icon={Percent}
        figure={formatPercent(summary.effectiveness)}
        quiet={summary.effectiveness === null}
        caption={`${plural(summary.aceptadas, 'aceptada', 'aceptadas')} de ${plural(summary.activadas, 'activada', 'activadas')}`}
      />
      <SummaryCard
        title="Cajeros"
        icon={Users}
        figure={formatInteger(summary.cashierCount)}
        caption={plural(summary.shiftCount, 'turno', 'turnos')}
      />
    </ul>
  );
}
