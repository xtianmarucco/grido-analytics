import {
  type AnalysisView,
  ErrorCode,
  exportRequestFieldsSchema,
  REPORT_CONTENT_TYPES,
  ReportFormat,
  reportFileName,
} from '@grido/shared';
import { type Request, type Response, Router } from 'express';

import { renderReportPdf } from '../export/pdf/render-report-pdf.js';
import { type ReportMeta, reportMeta } from '../export/report-meta.js';
import { renderReportWorkbook } from '../export/xlsx/build-report-workbook.js';
import { analyzeWorkbook, requireUploadedWorkbook } from './analyze-upload.js';
import { HttpError } from './errors.js';
import { xlsxUpload } from './upload.js';

type Renderer = (view: AnalysisView, meta: ReportMeta) => Promise<Buffer>;

const RENDERERS: Record<ReportFormat, Renderer> = {
  [ReportFormat.Pdf]: renderReportPdf,
  [ReportFormat.Xlsx]: renderReportWorkbook,
};

function requestedViewId(req: Request): string {
  const parsed = exportRequestFieldsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new HttpError(
      400,
      ErrorCode.InvalidView,
      'Seleccione una vista válida para generar el informe.',
    );
  }
  return parsed.data.view;
}

function sendReport(res: Response, format: ReportFormat, view: AnalysisView, body: Buffer): void {
  // ASCII-only by construction (reportSlug), so no RFC 5987 `filename*` is needed.
  const filename = reportFileName({ label: view.label, period: view.summary.period }, format);
  res
    .status(200)
    .set({
      'Content-Type': REPORT_CONTENT_TYPES[format],
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    .end(body);
}

/**
 * `POST /api/exports/pdf` and `/xlsx`: re-imports the uploaded file (same checks and errors as
 * `/api/analysis`), picks the requested view and returns its report. Nothing is stored.
 */
export function createExportRouter(): Router {
  const router = Router();

  for (const format of Object.values(ReportFormat)) {
    router.post(`/${format}`, xlsxUpload(), async (req, res) => {
      const workbook = requireUploadedWorkbook(req);
      const viewId = requestedViewId(req);
      const analysis = await analyzeWorkbook(workbook);
      const view = analysis.views.find((candidate) => candidate.id === viewId);
      if (!view) {
        throw new HttpError(
          400,
          ErrorCode.InvalidView,
          'La vista seleccionada no existe en este archivo.',
        );
      }
      const body = await RENDERERS[format](view, reportMeta(analysis.import));
      sendReport(res, format, view, body);
    });
  }

  return router;
}
