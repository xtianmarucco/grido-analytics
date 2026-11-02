import type { AnalysisView, Effectiveness, PodiumStep, RankingEntry } from '@grido/shared';
import ExcelJS from 'exceljs';

import {
  formatBranches,
  formatGeneratedAt,
  formatOrdinal,
  formatPeriod,
  NOT_CALCULABLE,
} from '../format.js';
import {
  emptyStepText,
  OBSERVATION_TITLES,
  PODIUM_REQUIREMENTS,
  podiumStatusLabel,
  REPORT_TITLE,
} from '../report-copy.js';
import type { ReportMeta } from '../report-meta.js';

const PERCENT_FORMAT = '0.00%';

interface Column {
  header: string;
  width: number;
}

/** A fraction shown with the `0.00%` format. */
interface PercentValue {
  fraction: number;
}

type CellValue = string | number | PercentValue | null;

/**
 * Effectiveness as an Excel percent: the analysis percent as a fraction (`18.87` → `0.1887`) so
 * the `0.00%` format shows it; `null` stays the text "No calculable".
 */
function effectivenessCell(value: Effectiveness): CellValue {
  return value === null ? NOT_CALCULABLE : { fraction: value / 100 };
}

function addTable(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: readonly (readonly CellValue[])[],
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.header, width: column.width }));
  sheet.getRow(1).font = { bold: true };
  for (const values of rows) {
    // Empty cells stay unset rather than holding empty strings.
    const row = sheet.addRow(
      values.map((value) =>
        value === null ? undefined : typeof value === 'object' ? value.fraction : value,
      ),
    );
    values.forEach((value, index) => {
      if (value !== null && typeof value === 'object')
        row.getCell(index + 1).numFmt = PERCENT_FORMAT;
    });
  }
  return sheet;
}

function resumenSheet(workbook: ExcelJS.Workbook, view: AnalysisView, meta: ReportMeta): void {
  const { summary } = view;
  addTable(
    workbook,
    'Resumen',
    [
      { header: 'Concepto', width: 26 },
      { header: 'Valor', width: 32 },
    ],
    [
      ['Informe', REPORT_TITLE],
      ['Vista', view.label],
      ['Sucursales', formatBranches(view.branchCodes, meta.branchNames)],
      ['Período', formatPeriod(summary.period)],
      ['Tickets', summary.tickets],
      ['Sobreventas activadas', summary.activadas],
      ['Sobreventas aceptadas', summary.aceptadas],
      ['Efectividad general', effectivenessCell(summary.effectiveness)],
      ['Cajeros', summary.cashierCount],
      ['Turnos', summary.shiftCount],
      ['Generado', formatGeneratedAt(meta.generatedAt)],
    ],
  );
}

function rankingSheet(workbook: ExcelJS.Workbook, view: AnalysisView, meta: ReportMeta): void {
  const columns: Column[] = [
    { header: 'Posición', width: 10 },
    { header: 'Cajero', width: 22 },
    { header: 'Sucursales', width: 26 },
    { header: 'Turnos', width: 9 },
    { header: 'Tickets', width: 10 },
    { header: 'Activadas', width: 11 },
    { header: 'Aceptadas', width: 11 },
    { header: 'Efectividad', width: 14 },
    { header: 'Participa del podio', width: 19 },
    { header: 'Motivos', width: 60 },
  ];
  const rows = view.ranking.map((entry: RankingEntry) => [
    entry.position,
    entry.cashierName,
    formatBranches(entry.branchCodes, meta.branchNames),
    entry.shiftCount,
    entry.tickets,
    entry.activadas,
    entry.aceptadas,
    effectivenessCell(entry.effectiveness),
    entry.eligible ? 'Sí' : 'No',
    entry.ineligibilityReasons.map((reason) => reason.message).join('; ') || null,
  ]);
  const sheet = addTable(workbook, 'Ranking', columns, rows);
  sheet.autoFilter = `A1:${sheet.getColumn(columns.length).letter}${rows.length + 1}`;
}

function podiumRows(steps: readonly PodiumStep[]): CellValue[][] {
  return steps.flatMap((step) => {
    const ordinal = formatOrdinal(step.position);
    if (step.cashiers.length === 0) return [[ordinal, emptyStepText(step, steps)]];
    return step.cashiers.map((cashier) => [
      ordinal,
      podiumStatusLabel(step),
      cashier.cashierName,
      effectivenessCell(cashier.effectiveness),
      cashier.tickets,
      cashier.activadas,
      cashier.aceptadas,
    ]);
  });
}

function podiumSheet(workbook: ExcelJS.Workbook, view: AnalysisView): void {
  const sheet = addTable(
    workbook,
    'Podio',
    [
      { header: 'Puesto', width: 9 },
      { header: 'Estado', width: 30 },
      { header: 'Cajero', width: 22 },
      { header: 'Efectividad', width: 14 },
      { header: 'Tickets', width: 10 },
      { header: 'Activadas', width: 11 },
      { header: 'Aceptadas', width: 11 },
    ],
    podiumRows(view.podium),
  );
  sheet.addRow([]);
  sheet.addRow([PODIUM_REQUIREMENTS]);
}

function observationsSheet(workbook: ExcelJS.Workbook, view: AnalysisView): void {
  const names = new Map(view.ranking.map((entry) => [entry.cashierKey, entry.cashierName]));
  const sheet = addTable(
    workbook,
    'Observaciones',
    [
      { header: 'Regla', width: 8 },
      { header: 'Título', width: 30 },
      { header: 'Cajero', width: 20 },
      { header: 'Dato', width: 60 },
      { header: 'Interpretación', width: 60 },
      { header: 'Recomendación', width: 60 },
    ],
    view.observations.map((observation) => [
      observation.rule,
      OBSERVATION_TITLES[observation.rule],
      observation.cashierKey ? (names.get(observation.cashierKey) ?? observation.cashierKey) : null,
      observation.fact,
      observation.interpretation,
      observation.recommendation,
    ]),
  );
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { wrapText: true, vertical: 'top' };
  });
}

/**
 * Pure: the Excel report of one analysis view. Sheets `Resumen`, `Ranking`, `Podio` and
 * `Observaciones`. It only lays out the view; every figure comes from the analysis.
 */
export function buildReportWorkbook(view: AnalysisView, meta: ReportMeta): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grido Analytics';
  workbook.created = meta.generatedAt;
  resumenSheet(workbook, view, meta);
  rankingSheet(workbook, view, meta);
  podiumSheet(workbook, view);
  observationsSheet(workbook, view);
  return workbook;
}

/** The workbook as `.xlsx` bytes, in memory. */
export async function renderReportWorkbook(view: AnalysisView, meta: ReportMeta): Promise<Buffer> {
  const bytes = await buildReportWorkbook(view, meta).xlsx.writeBuffer();
  return Buffer.from(bytes);
}
