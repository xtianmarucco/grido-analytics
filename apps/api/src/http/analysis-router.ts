import { Router } from 'express';

import { analyzeWorkbook, requireUploadedWorkbook } from './analyze-upload.js';
import { xlsxUpload } from './upload.js';

/** `POST /api/analysis`: adapts the multipart upload to the import, then the analysis. */
export function createAnalysisRouter(): Router {
  const router = Router();

  router.post('/', xlsxUpload(), async (req, res) => {
    res.json(await analyzeWorkbook(requireUploadedWorkbook(req)));
  });

  return router;
}
