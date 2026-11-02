import type { AnalysisView, ImportResult } from '@grido/shared';
import { TriangleAlert, Users } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatPeriod } from '@/lib/format';
import { plural } from '@/lib/plural';

import { EffectivenessChart } from './EffectivenessChart';
import { IMPORTED_DATA_ID, ImportedData } from './ImportedData';
import { ObservationList } from './ObservationList';
import { Podium } from './Podium';
import { RankingTable } from './RankingTable';
import { SummaryCards } from './SummaryCards';
import { ViewSelector } from './ViewSelector';

export interface AnalysisDashboardViewProps {
  /** The selected view; `undefined` only when the API returned no views. */
  view: AnalysisView | undefined;
  views: readonly AnalysisView[];
  importResult: ImportResult;
  onSelectView: (viewId: string) => void;
  importedOpen: boolean;
  onImportedOpenChange: (open: boolean) => void;
}

/**
 * Presentational: the selected view in the guide order (§6): summary → podium → observations →
 * ranking → chart → "Datos importados".
 */
export function AnalysisDashboardView({
  view,
  views,
  importResult,
  onSelectView,
  importedOpen,
  onImportedOpenChange,
}: AnalysisDashboardViewProps) {
  const warnings = importResult.warnings.length;
  // The combined view lists the branches each cashier worked in.
  const branchNames =
    view && view.branchCodes.length > 1
      ? Object.fromEntries(importResult.branches.map((branch) => [branch.code, branch.name]))
      : undefined;

  return (
    <section aria-labelledby="dashboard-title" className="flex flex-col gap-8">
      <h2 id="dashboard-title" className="sr-only">
        Resultados del análisis
      </h2>

      {warnings > 0 && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertTitle>{plural(warnings, 'advertencia', 'advertencias')}</AlertTitle>
          <AlertDescription>
            <p>
              {`Se procesó el archivo con ${plural(warnings, 'advertencia', 'advertencias')}. Revíselas en `}
              <a
                href={`#${IMPORTED_DATA_ID}`}
                onClick={() => onImportedOpenChange(true)}
                className="font-medium text-primary underline underline-offset-4"
              >
                «Datos importados»
              </a>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      {view && (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <ViewSelector views={views} selectedId={view.id} onSelect={onSelectView} />
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatPeriod(view.summary.period)}
            </p>
          </div>
          <p aria-live="polite" className="sr-only">
            {`Mostrando ${view.label}`}
          </p>

          <SummaryCards summary={view.summary} />
          {view.ranking.length === 0 ? (
            <>
              <p className="flex items-center justify-center gap-2 rounded-xl border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
                <Users className="size-4 shrink-0" aria-hidden />
                No hay cajeros con turnos en esta vista.
              </p>
              <ObservationList observations={view.observations} ranking={view.ranking} />
            </>
          ) : (
            <>
              <Podium steps={view.podium} />
              <ObservationList observations={view.observations} ranking={view.ranking} />
              <RankingTable key={view.id} entries={view.ranking} branchNames={branchNames} />
              <EffectivenessChart entries={view.ranking} />
            </>
          )}
        </>
      )}

      <ImportedData result={importResult} open={importedOpen} onOpenChange={onImportedOpenChange} />
    </section>
  );
}
