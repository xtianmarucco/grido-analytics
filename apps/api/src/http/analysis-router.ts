import { type AnalysisResponse, ErrorCode, type ImportResult } from '@grido/shared';
import { Router } from 'express';

import { analyzeImport } from '../analysis/analyze.js';
import { ImportError, type ImportErrorCode } from '../import/errors.js';
import { importShiftWorkbook } from '../import/import-shift-workbook.js';
import { HttpError } from './errors.js';
import { hasZipSignature, unsupportedFileType, xlsxUpload } from './upload.js';

const IMPORT_ERROR_STATUS: Record<ImportErrorCode, number> = {
  [ErrorCode.FileTooLarge]: 413,
  [ErrorCode.UnreadableFile]: 422,
  [ErrorCode.EmptyFile]: 422,
  [ErrorCode.MissingColumns]: 422,
  [ErrorCode.MultiplePeriods]: 422,
  [ErrorCode.TooManyRows]: 422,
  [ErrorCode.NoValidRows]: 422,
};

/** `POST /api/analysis`: adapts the multipart upload to the import, then the analysis. */
export function createAnalysisRouter(): Router {
  const router = Router();

  router.post('/', xlsxUpload(), async (req, res) => {
    if (!req.file) {
      throw new HttpError(
        400,
        ErrorCode.FileRequired,
        'Seleccione un archivo Excel (.xlsx) para analizar.',
      );
    }
    if (!hasZipSignature(req.file.buffer)) throw unsupportedFileType();

    let result: ImportResult;
    try {
      result = await importShiftWorkbook(req.file.buffer);
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

    const body: AnalysisResponse = { import: result, views: analyzeImport(result) };
    res.json(body);
  });

  return router;
}
