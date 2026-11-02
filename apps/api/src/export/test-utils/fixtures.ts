import type { AnalysisView, ImportResult } from '@grido/shared';

import { analyzeImport } from '../../analysis/analyze.js';
import { shift } from '../../analysis/test-utils/builders.js';
import { type ReportMeta, reportMeta } from '../report-meta.js';

/** Test-only report inputs. Names are fictitious; real files never enter the repository. */

const almirante = { branchCode: 1, branchName: 'Almirante' };
const barranqueras = { branchCode: 2, branchName: 'Barranqueras' };

function counts(tickets: number, activadas: number, aceptadas: number) {
  return {
    tickets,
    noActivadas: tickets - activadas,
    rechazadas: activadas - aceptadas,
    aceptadas,
  };
}

/**
 * Almirante: Ana and Bruno eligible, Dario without aceptadas, Fede under 30 tickets and without
 * activadas ("No calculable"), so step 3 is vacant. Dario also works in Barranqueras.
 * Cash control: Ana's shift is short by $ 100 (2,50 % of the cash: alert); Bruno's cash share
 * (20 %) is 20 points below the other Almirante day cashiers (signal); Eva has a $ 15 sobrante
 * (0,38 %: no alert).
 */
export const sampleImport: ImportResult = {
  period: { from: '2026-10-19', to: '2026-10-25' },
  branches: [
    { code: 1, name: 'Almirante', shiftCount: 4 },
    { code: 2, name: 'Barranqueras', shiftCount: 3 },
  ],
  shifts: [
    shift({
      ...almirante,
      cashierKey: 'ana',
      cashierName: 'Ana',
      ...counts(239, 212, 40),
      startedAt: '2026-10-21T08:00:00',
      closedAt: '2026-10-21T15:30:00',
      turDiferencia: -100,
    }),
    shift({
      ...almirante,
      cashierKey: 'bruno',
      cashierName: 'Bruno',
      ...counts(180, 173, 1),
      turEfectivo: 2000,
    }),
    shift({ ...almirante, cashierKey: 'dario', cashierName: 'Dario', ...counts(40, 34, 0) }),
    shift({ ...almirante, cashierKey: 'fede', cashierName: 'Fede', ...counts(10, 0, 0) }),
    shift({ ...barranqueras, cashierKey: 'carla', cashierName: 'Carla', ...counts(300, 276, 3) }),
    shift({
      ...barranqueras,
      cashierKey: 'eva',
      cashierName: 'Eva',
      ...counts(356, 339, 2),
      turDiferencia: 15,
    }),
    shift({ ...barranqueras, cashierKey: 'dario', cashierName: 'Dario', ...counts(58, 55, 0) }),
  ],
  warnings: [],
  summary: { totalRows: 7, includedRows: 7, excludedRows: 0 },
};

/** 26/10/2026 09:05 in the server's local time. */
export const GENERATED_AT = new Date(2026, 9, 26, 9, 5);

export const sampleViews: AnalysisView[] = analyzeImport(sampleImport);

export function sampleView(id: string): AnalysisView {
  const found = sampleViews.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No sample view ${id}`);
  return found;
}

export const sampleMeta: ReportMeta = reportMeta(sampleImport, GENERATED_AT);
