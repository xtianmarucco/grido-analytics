import { type AnalysisResponse, ErrorCode, type ImportResult } from '@grido/shared';
import type { Request } from 'express';

import { analyzeImport } from '../analysis/analyze.js';
import { ImportError, type ImportErrorCode } from '../import/errors.js';
import { importShiftWorkbook } from '../import/import-shift-workbook.js';
import { HttpError } from './errors.js';
import { hasZipSignature, unsupportedFileType } from './upload.js';

const IMPORT_ERROR_STATUS: Record<ImportErrorCode, number> = {
  [ErrorCode.FileTooLarge]: 413,
  [ErrorCode.UnreadableFile]: 422,
  [ErrorCode.EmptyFile]: 422,
  [ErrorCode.MissingColumns]: 422,
  [ErrorCode.MultiplePeriods]: 422,
  [ErrorCode.TooManyRows]: 422,
  [ErrorCode.NoValidRows]: 422,
};

/** The uploaded `.xlsx` from `xlsxUpload()`, or the same 400/415 errors for every route. */
export function requireUploadedWorkbook(req: Request): Buffer {
  if (!req.file) {
    throw new HttpError(
      400,
      ErrorCode.FileRequired,
      'Seleccione un archivo Excel (.xlsx) para analizar.',
    );
  }
  if (!hasZipSignature(req.file.buffer)) throw unsupportedFileType();
  return req.file.buffer;
}

/** Import → analysis of an uploaded workbook; import failures become `HttpError`s. */
export async function analyzeWorkbook(buffer: Buffer): Promise<AnalysisResponse> {
  let result: ImportResult;
  try {
    result = await importShiftWorkbook(buffer);
  } catch (error) {
    if (error instanceof ImportError) {
      throw new HttpError(
        IMPORT_ERROR_STATUS[error.code],
        error.code,
        error.message,
        error.details,
      );
    }
    throw error;
  }
  return { import: result, views: analyzeImport(result) };
}
