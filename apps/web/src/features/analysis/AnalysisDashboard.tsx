import type { AnalysisResponse, AnalysisView } from '@grido/shared';
import { useState } from 'react';

import { AnalysisDashboardView } from './AnalysisDashboardView';

/** The owner's overview: shown first when the API returns it (D-34). */
export const DEFAULT_VIEW_ID = 'all';

function defaultViewId(views: readonly AnalysisView[]): string | undefined {
  return views.find((view) => view.id === DEFAULT_VIEW_ID)?.id ?? views[0]?.id;
}

export interface AnalysisDashboardProps {
  /** One upload's result. Remount (new `key`) on each upload to reset the selected view. */
  analysis: AnalysisResponse;
}

/** Container: holds the selected view. Switching views never triggers a request. */
export function AnalysisDashboard({ analysis }: AnalysisDashboardProps) {
  const [selectedViewId, setSelectedViewId] = useState(() => defaultViewId(analysis.views));
  const view = analysis.views.find((candidate) => candidate.id === selectedViewId);

  return (
    <AnalysisDashboardView
      view={view}
      views={analysis.views}
      importResult={analysis.import}
      onSelectView={setSelectedViewId}
    />
  );
}
