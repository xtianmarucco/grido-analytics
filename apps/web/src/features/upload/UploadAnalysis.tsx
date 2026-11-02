import { ErrorCode, type ImportWarning, importWarningSchema } from '@grido/shared';
import { useState } from 'react';
import { z } from 'zod';

import { ApiError, ClientErrorCode } from '@/lib/api';

import { UploadAnalysisView, type UploadState } from './UploadAnalysisView';
import { useAnalysisUpload } from './useAnalysisUpload';

/** API codes whose `message` is user-facing Spanish copy. Others get a generic message. */
const USER_FACING_CODES = new Set<string>(
  Object.values(ErrorCode).filter(
    (code) => code !== ErrorCode.NotFound && code !== ErrorCode.InternalError,
  ),
);

const warningDetailsSchema = z.object({ warnings: z.array(importWarningSchema) });

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (USER_FACING_CODES.has(error.code)) return error.message;
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

/** Container: keeps the selected file (exports will re-send it) and maps the upload mutation. */
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
    state = { kind: 'success', fileName: file.name, result: upload.data.import };
  }

  return <UploadAnalysisView state={state} onFileSelected={selectFile} />;
}
