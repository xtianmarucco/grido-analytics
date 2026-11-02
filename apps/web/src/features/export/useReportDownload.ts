import { useMutation } from '@tanstack/react-query';

import { downloadReport, type ReportRequest } from '@/lib/api';
import { saveBlob } from '@/lib/download';

/** Generates a report on the server, then hands it to the browser as a download. */
export function useReportDownload() {
  return useMutation({
    mutationFn: async (request: ReportRequest) => {
      const { blob, filename } = await downloadReport(request);
      saveBlob(blob, filename);
    },
  });
}
