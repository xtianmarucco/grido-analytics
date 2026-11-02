import { describe, expect, it } from 'vitest';

import { sampleMeta, sampleView } from '../test-utils/fixtures.js';
import { renderReportPdf } from './render-report-pdf.js';

describe('renderReportPdf', () => {
  it('renders a PDF in memory with the bundled fonts', async () => {
    const buffer = await renderReportPdf(sampleView('all'), sampleMeta);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(10_000);
    expect(buffer.subarray(-6).toString('latin1')).toContain('%%EOF');
  });
});
