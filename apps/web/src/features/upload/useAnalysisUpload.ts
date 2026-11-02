import { useMutation } from '@tanstack/react-query';

import { uploadAnalysis } from '@/lib/api';

export function useAnalysisUpload() {
  return useMutation({ mutationFn: uploadAnalysis });
}
