import { z } from 'zod';

import { analysisViewSchema } from './analysis.js';

/** Report formats of `POST /api/exports/:format`. */
export const ReportFormat = {
  Pdf: 'pdf',
  Xlsx: 'xlsx',
} as const;

export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

export const REPORT_CONTENT_TYPES: Record<ReportFormat, string> = {
  [ReportFormat.Pdf]: 'application/pdf',
  [ReportFormat.Xlsx]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Non-file multipart fields of an export request: the id of the view to export. */
export const exportRequestFieldsSchema = z.object({
  view: analysisViewSchema.shape.id,
});

export type ExportRequestFields = z.infer<typeof exportRequestFieldsSchema>;

/**
 * ASCII file-name slug of a view label: accents stripped, lowercase, every run of other
 * characters → one hyphen (`Ambas sucursales` → `ambas-sucursales`).
 */
export function reportSlug(label: string): string {
  const slug = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'vista' : slug;
}

/** `grido-informe-<slug>-<from>-al-<to>.<ext>`; ASCII only, safe in `Content-Disposition`. */
export function reportFileName(
  view: { label: string; period: { from: string; to: string } },
  format: ReportFormat,
): string {
  return `grido-informe-${reportSlug(view.label)}-${view.period.from}-al-${view.period.to}.${format}`;
}
