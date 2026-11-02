import type { AnalysisResponse, AnalysisView } from '@grido/shared';
import { useState } from 'react';

import { ReportDownloads } from '@/features/export/ReportDownloads';

import { AnalysisDashboardView } from './AnalysisDashboardView';

/** The owner's overview: shown first when the API returns it (D-34). */
export const DEFAULT_VIEW_ID = 'all';

function defaultViewId(views: readonly AnalysisView[]): string | undefined {
  return views.find((view) => view.id === DEFAULT_VIEW_ID)?.id ?? views[0]?.id;
}

export interface AnalysisDashboardProps {
  /** One upload's result. Remount (new `key`) on each upload to reset the selected view. */
  analysis: AnalysisResponse;
  /** The uploaded Excel. When present, the selected view's reports can be downloaded. */
  file?: File | undefined;
}

/**
 * Container: holds the selected view and the "Datos importados" disclosure. Its only requests are
 * the report downloads of the selected view.
 */
export function AnalysisDashboard({ analysis, file }: AnalysisDashboardProps) {
  const [selectedViewId, setSelectedViewId] = useState(() => defaultViewId(analysis.views));
  const [importedOpen, setImportedOpen] = useState(false);
  const view = analysis.views.find((candidate) => candidate.id === selectedViewId);

  return (
    <AnalysisDashboardView
      view={view}
      views={analysis.views}
      importResult={analysis.import}
      onSelectView={setSelectedViewId}
      importedOpen={importedOpen}
      onImportedOpenChange={setImportedOpen}
      reportActions={file && view ? <ReportDownloads file={file} view={view} /> : undefined}
    />
  );
}
