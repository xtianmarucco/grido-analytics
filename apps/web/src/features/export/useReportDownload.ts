import { useIsMutating, useMutation } from '@tanstack/react-query';

import { downloadReport, type ReportRequest } from '@/lib/api';
import { saveBlob } from '@/lib/download';

const REPORT_DOWNLOAD_KEY = ['report-download'] as const;

/** Generates a report on the server, then hands it to the browser as a download. */
export function useReportDownload() {
  return useMutation({
    mutationKey: REPORT_DOWNLOAD_KEY,
    mutationFn: async (request: ReportRequest) => {
      const { blob, filename } = await downloadReport(request);
      saveBlob(blob, filename);
    },
  });
}

/** Whether any report is being generated (e.g. to lock the view selector meanwhile). */
export function useIsGeneratingReport(): boolean {
  return useIsMutating({ mutationKey: REPORT_DOWNLOAD_KEY }) > 0;
}
