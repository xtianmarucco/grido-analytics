import type { AnalysisView, ReportFormat } from '@grido/shared';

import { ApiError, ClientErrorCode, isUserFacingError } from '@/lib/api';

import { ReportDownloadsView } from './ReportDownloadsView';
import { useReportDownload } from './useReportDownload';

function errorMessage(error: unknown): string {
  if (isUserFacingError(error)) return error.message;
  if (error instanceof ApiError && error.code === ClientErrorCode.NetworkError) {
    return 'No se pudo conectar con el servidor. Verifique que la aplicación esté en ejecución e intente nuevamente.';
  }
  return 'Ocurrió un error inesperado al generar el informe. Intente nuevamente.';
}

export interface ReportDownloadsProps {
  /** The uploaded Excel; re-sent with the view id on every download (D-11). */
  file: File;
  view: AnalysisView;
}

/** Container: one download at a time for the selected view. */
export function ReportDownloads({ file, view }: ReportDownloadsProps) {
  const download = useReportDownload();
  const generating = download.isPending ? download.variables.format : undefined;

  function start(format: ReportFormat) {
    download.mutate({
      file,
      viewId: view.id,
      format,
      report: { label: view.label, period: view.summary.period },
    });
  }

  return (
    <ReportDownloadsView
      viewLabel={view.label}
      generating={generating}
      error={download.isError ? errorMessage(download.error) : undefined}
      onDownload={start}
    />
  );
}
