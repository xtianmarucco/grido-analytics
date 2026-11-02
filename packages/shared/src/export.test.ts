import { describe, expect, it } from 'vitest';

import {
  exportRequestFieldsSchema,
  REPORT_CONTENT_TYPES,
  ReportFormat,
  reportFileName,
  reportSlug,
} from './export.js';

const period = { from: '2026-10-19', to: '2026-10-25' };

describe('exportRequestFieldsSchema', () => {
  it.each(['branch-1', 'branch-12', 'all'])('accepts the view id %s', (view) => {
    expect(exportRequestFieldsSchema.parse({ view })).toEqual({ view });
  });

  it.each([undefined, '', 'branch-0', 'branch-x', 'combined', 'ALL', ' all'])(
    'rejects the view id %s',
    (view) => {
      expect(exportRequestFieldsSchema.safeParse({ view }).success).toBe(false);
    },
  );
});

describe('reportSlug', () => {
  it.each([
    ['Almirante', 'almirante'],
    ['Barranqueras', 'barranqueras'],
    ['Ambas sucursales', 'ambas-sucursales'],
    ['  Todas las  Sucursales ', 'todas-las-sucursales'],
    ['Peñón Ñandú', 'penon-nandu'],
    ['Río / Norte #2', 'rio-norte-2'],
  ])('%s → %s', (label, slug) => {
    expect(reportSlug(label)).toBe(slug);
  });

  it('falls back to "vista" when nothing ASCII is left', () => {
    expect(reportSlug('---')).toBe('vista');
  });
});

describe('reportFileName', () => {
  it('builds the PDF name from the view label and period', () => {
    expect(reportFileName({ label: 'Ambas sucursales', period }, ReportFormat.Pdf)).toBe(
      'grido-informe-ambas-sucursales-2026-10-19-al-2026-10-25.pdf',
    );
  });

  it('builds the Excel name', () => {
    expect(reportFileName({ label: 'Almirante', period }, ReportFormat.Xlsx)).toBe(
      'grido-informe-almirante-2026-10-19-al-2026-10-25.xlsx',
    );
  });
});

describe('REPORT_CONTENT_TYPES', () => {
  it('maps each format to its MIME type', () => {
    expect(REPORT_CONTENT_TYPES).toEqual({
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });
});
