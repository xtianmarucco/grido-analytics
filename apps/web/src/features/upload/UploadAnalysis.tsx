import { type ImportWarning, importWarningSchema } from '@grido/shared';
import { useState } from 'react';
import { z } from 'zod';

import { AnalysisDashboard } from '@/features/analysis/AnalysisDashboard';
import { ApiError, ClientErrorCode, isUserFacingError } from '@/lib/api';

import { UploadAnalysisView, type UploadState } from './UploadAnalysisView';
import { useAnalysisUpload } from './useAnalysisUpload';

const warningDetailsSchema = z.object({ warnings: z.array(importWarningSchema) });

function errorMessage(error: unknown): string {
  if (isUserFacingError(error)) return error.message;
  if (error instanceof ApiError) {
    if (error.code === ClientErrorCode.NetworkError) {
      return 'No se pudo conectar con el servidor. Verifique que la aplicación esté en ejecución e intente nuevamente.';
    }
  }
  return 'Ocurrió un error inesperado al procesar el archivo. Intente nuevamente.';
}

function errorWarnings(error: unknown): ImportWarning[] {
  if (!(error instanceof ApiError)) return [];
  const parsed = warningDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data.warnings : [];
}

/**
 * Container: keeps the selected file (report downloads re-send it), maps the upload mutation
 * and shows the dashboard for a successful result. Each upload replaces the whole result.
 */
export function UploadAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const upload = useAnalysisUpload();

  function selectFile(next: File) {
    setFile(next);
    upload.mutate(next);
  }

  let state: UploadState;
  if (!file || upload.isIdle) {
    state = { kind: 'idle' };
  } else if (upload.isPending) {
    state = { kind: 'processing', fileName: file.name };
  } else if (upload.isError) {
    state = {
      kind: 'error',
      fileName: file.name,
      message: errorMessage(upload.error),
      warnings: errorWarnings(upload.error),
    };
  } else {
    state = {
      kind: 'success',
      fileName: file.name,
      shiftCount: upload.data.import.shifts.length,
      warningCount: upload.data.import.warnings.length,
    };
  }

  return (
    <div className="flex flex-col gap-8">
      <UploadAnalysisView state={state} onFileSelected={selectFile} />
      {state.kind === 'success' && upload.data && (
        // A new key per upload resets the selected view and the disclosure.
        <AnalysisDashboard
          key={upload.submittedAt}
          analysis={upload.data}
          file={file ?? undefined}
        />
      )}
    </div>
  );
}
