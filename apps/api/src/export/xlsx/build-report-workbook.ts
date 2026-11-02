import type {
  AnalysisView,
  CashierCashIndicators,
  Effectiveness,
  PodiumStep,
  RankingEntry,
  ShiftSlot,
} from '@grido/shared';
import ExcelJS from 'exceljs';

import { SLOT_LABELS } from '../../analysis/cash-control.js';
import {
  formatBranches,
  formatDate,
  formatGeneratedAt,
  formatOrdinal,
  formatPeriod,
  NOT_CALCULABLE,
} from '../format.js';
import {
  CASH_CONTROL_TITLE,
  CASH_LIMITATION_NOTE,
  emptyStepText,
  LOW_CASH_TITLE,
  NO_SIGNALS_TEXT,
  OBSERVATION_TITLES,
  PODIUM_REQUIREMENTS,
  podiumStatusLabel,
  REPORT_TITLE,
  SHIFT_ALERTS_TITLE,
} from '../report-copy.js';
import type { ReportMeta } from '../report-meta.js';

const PERCENT_FORMAT = '0.00%';
/** Pesos with cents; Excel applies the reader's locale separators. */
export const MONEY_FORMAT = '"$" #,##0.00';
const DECIMAL_FORMAT = '0.00';

interface Column {
  header: string;
  width: number;
}

/** A fraction shown with the `0.00%` format. */
interface PercentValue {
  fraction: number;
}

/** Pesos shown with `MONEY_FORMAT`. */
interface MoneyValue {
  money: number;
}

/** A plain number shown with two decimals (hours, tickets per hour, points). */
interface DecimalValue {
  decimal: number;
}

type CellValue = string | number | PercentValue | MoneyValue | DecimalValue | null;

const money = (value: number | null): CellValue =>
  value === null ? NOT_CALCULABLE : { money: value };
const decimal = (value: number | null): CellValue =>
  value === null ? NOT_CALCULABLE : { decimal: value };

/**
 * Effectiveness as an Excel percent: the analysis percent as a fraction (`18.87` → `0.1887`) so
 * the `0.00%` format shows it; `null` stays the text "No calculable".
 */
function effectivenessCell(value: Effectiveness): CellValue {
  return value === null ? NOT_CALCULABLE : { fraction: value / 100 };
}

/** A percent (`39.44`) as an Excel fraction; `null` stays "No calculable". */
const percentCell = effectivenessCell;

function rawValue(value: CellValue): ExcelJS.CellValue | undefined {
  if (value === null) return undefined;
  if (typeof value !== 'object') return value;
  if ('fraction' in value) return value.fraction;
  if ('money' in value) return value.money;
  return value.decimal;
}

function numberFormat(value: CellValue): string | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  if ('fraction' in value) return PERCENT_FORMAT;
  if ('money' in value) return MONEY_FORMAT;
  return DECIMAL_FORMAT;
}

/** Appends one row; empty cells stay unset rather than holding empty strings. */
function writeRow(sheet: ExcelJS.Worksheet, values: readonly CellValue[]): ExcelJS.Row {
  const row = sheet.addRow(values.map(rawValue));
  values.forEach((value, index) => {
    const format = numberFormat(value);
    if (format) row.getCell(index + 1).numFmt = format;
  });
  return row;
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
  for (const values of rows) writeRow(sheet, values);
  return sheet;
}

function resumenSheet(workbook: ExcelJS.Workbook, view: AnalysisView, meta: ReportMeta): void {
  const { summary } = view;
  const cash = view.cashControl.summary;
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
      ['Ventas', money(cash.venta)],
      ['% efectivo', percentCell(cash.cashShare)],
      ['% Club Grido', percentCell(cash.clubShare)],
      ['Diferencia de caja', money(cash.difference.net)],
      ['Faltante', money(cash.difference.faltante)],
      ['Sobrante', money(cash.difference.sobrante)],
      ['Turnos a revisar', cash.difference.alertedShifts],
      ['Ticket promedio', money(cash.averageTicket)],
      ['Tickets por hora', decimal(cash.ticketsPerHour)],
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

const CASHIER_COLUMNS: Column[] = [
  { header: 'Cajero', width: 22 },
  { header: 'Sucursales', width: 26 },
  { header: 'Turnos', width: 9 },
  { header: 'Tickets', width: 10 },
  { header: 'Ventas', width: 16 },
  { header: 'Efectivo', width: 16 },
  { header: '% efectivo', width: 12 },
  { header: 'Club Grido', width: 16 },
  { header: '% Club Grido', width: 13 },
  { header: 'Diferencia neta', width: 16 },
  { header: 'Faltante', width: 14 },
  { header: 'Sobrante', width: 14 },
  { header: 'Turnos con diferencia', width: 12 },
  { header: 'Turnos a revisar', width: 12 },
  { header: 'Ticket promedio', width: 16 },
  { header: 'Horas', width: 10 },
  { header: 'Tickets por hora', width: 12 },
  { header: 'Tickets por hora (Día)', width: 12 },
  { header: 'Tickets por hora (Noche)', width: 12 },
];

function slotRate(cashier: CashierCashIndicators, slot: ShiftSlot): CellValue {
  const stats = cashier.slots.find((s) => s.slot === slot);
  return stats ? decimal(stats.ticketsPerHour) : null;
}

function cashierRow(cashier: CashierCashIndicators, meta: ReportMeta): CellValue[] {
  return [
    cashier.cashierName,
    formatBranches(cashier.branchCodes, meta.branchNames),
    cashier.shiftCount,
    cashier.tickets,
    money(cashier.venta),
    money(cashier.turEfectivo),
    percentCell(cashier.cashShare),
    money(cashier.ventaClubGrido),
    percentCell(cashier.clubShare),
    money(cashier.difference.net),
    money(cashier.difference.faltante),
    money(cashier.difference.sobrante),
    cashier.difference.shiftsWithDifference,
    cashier.difference.alertedShifts,
    money(cashier.averageTicket),
    decimal(cashier.hours),
    decimal(cashier.ticketsPerHour),
    slotRate(cashier, 'dia'),
    slotRate(cashier, 'noche'),
  ];
}

/** A block below the per-cashier table: bold title, bold header, rows or the empty text. */
function addBlock(
  sheet: ExcelJS.Worksheet,
  title: string,
  headers: readonly string[],
  rows: readonly CellValue[][],
): void {
  sheet.addRow([]);
  sheet.addRow([title]).font = { bold: true };
  if (rows.length === 0) {
    sheet.addRow([NO_SIGNALS_TEXT]);
    return;
  }
  sheet.addRow([...headers]).font = { bold: true };
  for (const values of rows) writeRow(sheet, values);
}

function cashControlSheet(workbook: ExcelJS.Workbook, view: AnalysisView, meta: ReportMeta): void {
  const { cashiers, shiftAlerts, lowCashSignals } = view.cashControl;
  const sheet = addTable(
    workbook,
    CASH_CONTROL_TITLE,
    CASHIER_COLUMNS,
    cashiers.map((cashier) => cashierRow(cashier, meta)),
  );
  addBlock(
    sheet,
    SHIFT_ALERTS_TITLE,
    [
      'Fecha',
      'Horario',
      'Sucursal',
      'Cajero',
      'Turno',
      'Diferencia',
      'Efectivo',
      '% del efectivo',
      'Tipo',
      'Detalle',
    ],
    shiftAlerts.map((alert) => [
      formatDate(alert.startedAt.slice(0, 10)),
      SLOT_LABELS[alert.slot],
      alert.branchName,
      alert.cashierName,
      alert.turno,
      money(alert.difference),
      money(alert.turEfectivo),
      alert.percentOfCash === null ? 'Sin efectivo' : percentCell(alert.percentOfCash),
      alert.kind === 'faltante' ? 'Faltante' : 'Sobrante',
      alert.message,
    ]),
  );
  addBlock(
    sheet,
    LOW_CASH_TITLE,
    [
      'Sucursal',
      'Horario',
      'Cajero',
      'Turnos',
      '% efectivo del cajero',
      '% efectivo del resto',
      'Diferencia (puntos)',
      'Detalle',
    ],
    lowCashSignals.map((signal) => [
      signal.branchName,
      SLOT_LABELS[signal.slot],
      signal.cashierName,
      signal.shiftCount,
      percentCell(signal.cashierShare),
      percentCell(signal.peersShare),
      decimal(signal.gapPoints),
      signal.message,
    ]),
  );
  sheet.addRow([]);
  sheet.addRow([CASH_LIMITATION_NOTE]);
}

/**
 * Pure: the Excel report of one analysis view. Sheets `Resumen`, `Ranking`, `Podio`,
 * `Observaciones` and `Control de caja`. It only lays out the view; every figure comes from the analysis.
 */
export function buildReportWorkbook(view: AnalysisView, meta: ReportMeta): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grido Analytics';
  workbook.created = meta.generatedAt;
  resumenSheet(workbook, view, meta);
  rankingSheet(workbook, view, meta);
  podiumSheet(workbook, view);
  observationsSheet(workbook, view);
  cashControlSheet(workbook, view, meta);
  return workbook;
}

/** The workbook as `.xlsx` bytes, in memory. */
export async function renderReportWorkbook(view: AnalysisView, meta: ReportMeta): Promise<Buffer> {
  const bytes = await buildReportWorkbook(view, meta).xlsx.writeBuffer();
  return Buffer.from(bytes);
}
