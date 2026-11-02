import type { AnalysisView } from '@grido/shared';
import pdfmake from 'pdfmake';
import vfs from 'pdfmake/build/vfs_fonts.js';
import type { TDocumentDefinitions } from 'pdfmake/interfaces.js';

import type { ReportMeta } from '../report-meta.js';
import { buildReportDocDefinition } from './build-report-doc-definition.js';

/** The pdfmake 0.3 Node singleton also exposes its in-memory file system (not in its typings). */
interface ServerPdfMake {
  virtualfs: { writeFileSync(filename: string, content: Buffer): void };
}

const ROBOTO = {
  normal: 'Roboto-Regular.ttf',
  bold: 'Roboto-Medium.ttf',
  italics: 'Roboto-Italic.ttf',
  bolditalics: 'Roboto-MediumItalic.ttf',
};

let configured = false;

/**
 * Loads pdfmake's bundled Roboto (base64 `vfs_fonts`) into its in-memory file system and denies
 * every URL and local file: rendering never touches the network or the disk.
 */
function configure(): void {
  if (configured) return;
  const { virtualfs } = pdfmake as typeof pdfmake & ServerPdfMake;
  for (const filename of Object.values(ROBOTO)) {
    const base64 = vfs[filename];
    if (!base64) throw new Error(`pdfmake font ${filename} not bundled`);
    virtualfs.writeFileSync(filename, Buffer.from(base64, 'base64'));
  }
  pdfmake.setFonts({ Roboto: ROBOTO });
  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy(() => false);
  configured = true;
}

export function renderDocDefinition(definition: TDocumentDefinitions): Promise<Buffer> {
  configure();
  return pdfmake.createPdf(definition).getBuffer();
}

/** The PDF report of one view, rendered in memory. */
export function renderReportPdf(view: AnalysisView, meta: ReportMeta): Promise<Buffer> {
  return renderDocDefinition(buildReportDocDefinition(view, meta));
}
