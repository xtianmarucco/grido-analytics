import type { AnalysisView, ImportResult } from '@grido/shared';

import { formatPeriod } from '@/lib/format';

import { Podium } from './Podium';
import { SummaryCards } from './SummaryCards';
import { ViewSelector } from './ViewSelector';

export interface AnalysisDashboardViewProps {
  /** The selected view; `undefined` only when the API returned no views. */
  view: AnalysisView | undefined;
  views: readonly AnalysisView[];
  importResult: ImportResult;
  onSelectView: (viewId: string) => void;
}

/** Presentational: composes the dashboard sections for the selected view. */
export function AnalysisDashboardView({ view, views, onSelectView }: AnalysisDashboardViewProps) {
  if (!view) return null;

  return (
    <section aria-labelledby="dashboard-title" className="flex flex-col gap-8">
      <h2 id="dashboard-title" className="sr-only">
        Resultados del análisis
      </h2>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ViewSelector views={views} selectedId={view.id} onSelect={onSelectView} />
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatPeriod(view.summary.period)}
        </p>
      </div>
      <SummaryCards summary={view.summary} />
      <Podium steps={view.podium} />
      <p aria-live="polite" className="sr-only">
        {`Mostrando ${view.label}`}
      </p>
    </section>
  );
}
