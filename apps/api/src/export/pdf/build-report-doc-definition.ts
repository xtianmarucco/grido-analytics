import {
  type AnalysisView,
  type Observation,
  type PodiumStep,
  PodiumStepStatus,
  type RankingEntry,
} from '@grido/shared';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces.js';

import {
  formatBranches,
  formatGeneratedAt,
  formatInteger,
  formatOrdinal,
  formatPercent,
  formatPeriod,
  plural,
} from '../format.js';
import {
  emptyStepText,
  OBSERVATION_TITLES,
  PODIUM_REQUIREMENTS,
  REPORT_TITLE,
} from '../report-copy.js';
import type { ReportMeta } from '../report-meta.js';

/**
 * Colors from the approved palette (docs/UI_UX_GUIDELINES.md §2). Text is always dark on a light
 * fill (or white on the deep primary), so the report stays legible printed in grayscale.
 */
const COLOR = {
  foreground: '#0F1B2D',
  primary: '#0B3D91',
  primaryForeground: '#FFFFFF',
  muted: '#EEF2F7',
  mutedForeground: '#4F5D72',
  border: '#D5DDE8',
  input: '#7E8B9C',
  success: '#15803D',
  podium: {
    1: { fill: '#F2C14E', text: '#3D2C00', edge: '#A27A12' },
    2: { fill: '#D3DAE3', text: '#0F1B2D', edge: '#7B8794' },
    3: { fill: '#E2A372', text: '#3D1F05', edge: '#9A5B2A' },
  },
} as const;

const EMPTY_VIEW_TEXT = 'No hay cajeros con turnos en esta vista.';

const sectionTitle = (text: string): Content => ({ text, style: 'section' });

/** Plain cell grid: light dividers, no outer frame. */
const GRID_LAYOUT = {
  hLineWidth: (row: number) => (row === 0 ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => COLOR.border,
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

function heading(view: AnalysisView, meta: ReportMeta): Content[] {
  return [
    { text: REPORT_TITLE, style: 'title' },
    { text: `${view.label} · ${formatPeriod(view.summary.period)}`, style: 'subtitle' },
    { text: `Generado el ${formatGeneratedAt(meta.generatedAt)}`, style: 'caption' },
  ];
}

function summaryCard(label: string, value: string, caption?: string): TableCell {
  const stack: Content[] = [
    { text: label, style: 'cardLabel' },
    { text: value, style: 'cardValue' },
  ];
  if (caption) stack.push({ text: caption, style: 'caption' });
  return { stack, fillColor: COLOR.muted, margin: [6, 4, 6, 4] };
}

function summary(view: AnalysisView, meta: ReportMeta): Content[] {
  const { summary: s } = view;
  return [
    sectionTitle('Resumen'),
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            summaryCard(
              'Período',
              formatPeriod(s.period),
              formatBranches(view.branchCodes, meta.branchNames),
            ),
            summaryCard('Tickets', formatInteger(s.tickets)),
            summaryCard('Sobreventas activadas', formatInteger(s.activadas)),
          ],
          [
            summaryCard('Sobreventas aceptadas', formatInteger(s.aceptadas)),
            summaryCard(
              'Efectividad general',
              formatPercent(s.effectiveness),
              `${formatInteger(s.aceptadas)} de ${formatInteger(s.activadas)} activadas`,
            ),
            summaryCard(
              'Cajeros',
              formatInteger(s.cashierCount),
              plural(s.shiftCount, 'turno', 'turnos'),
            ),
          ],
        ],
      },
      layout: {
        hLineWidth: () => 3,
        vLineWidth: () => 3,
        hLineColor: () => '#FFFFFF',
        vLineColor: () => '#FFFFFF',
      },
    },
  ];
}

function podiumCell(step: PodiumStep, steps: readonly PodiumStep[]): TableCell {
  const ordinal = formatOrdinal(step.position);
  const [first] = step.cashiers;
  if (step.status !== PodiumStepStatus.Filled || !first) {
    return {
      stack: [
        { text: `${ordinal} puesto`, bold: true },
        { text: emptyStepText(step, steps), margin: [0, 4, 0, 0] },
      ],
      fillColor: COLOR.muted,
      color: COLOR.mutedForeground,
      margin: [6, 6, 6, 6],
    };
  }
  const metal = COLOR.podium[step.position];
  const tied = step.cashiers.length > 1;
  const stack: Content[] = [{ text: `${ordinal} puesto`, bold: true }];
  if (tied) stack.push({ text: 'Empate', style: 'badge' });
  for (const cashier of step.cashiers)
    stack.push({ text: cashier.cashierName, style: 'podiumName' });
  // Tied cashiers share the same result (docs/BUSINESS_RULES.md).
  stack.push(
    { text: formatPercent(first.effectiveness), style: 'podiumValue' },
    {
      text: `${plural(first.aceptadas, 'aceptada', 'aceptadas')} de ${plural(first.activadas, 'activada', 'activadas')}`,
    },
  );
  if (tied) stack.push({ text: `Comparten el ${ordinal} puesto con el mismo resultado.` });
  return { stack, fillColor: metal.fill, color: metal.text, margin: [6, 6, 6, 6] };
}

function podium(view: AnalysisView): Content[] {
  return [
    sectionTitle('Podio'),
    {
      table: {
        widths: ['*', '*', '*'],
        body: [view.podium.map((step) => podiumCell(step, view.podium))],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => COLOR.input,
        vLineColor: () => COLOR.input,
      },
    },
    { text: PODIUM_REQUIREMENTS, style: 'caption', margin: [0, 4, 0, 0] },
  ];
}

function observation(item: Observation, names: ReadonlyMap<string, string>): Content {
  const title = OBSERVATION_TITLES[item.rule];
  const name = item.cashierKey ? names.get(item.cashierKey) : undefined;
  const labeled = (label: string, value: string): Content => ({
    text: [{ text: label, bold: true }, value],
    margin: [0, 1, 0, 0],
  });
  return {
    stack: [
      { text: name ? `${name} · ${title}` : title, bold: true, color: COLOR.primary },
      labeled('Dato: ', item.fact),
      labeled('Interpretación: ', item.interpretation),
      labeled('Recomendación: ', item.recommendation),
    ],
    margin: [0, 0, 0, 8],
    unbreakable: true,
  };
}

function observations(view: AnalysisView): Content[] {
  const names = new Map(view.ranking.map((entry) => [entry.cashierKey, entry.cashierName]));
  return [
    sectionTitle('Observaciones'),
    view.observations.length === 0
      ? { text: 'No hay observaciones para esta vista.', color: COLOR.mutedForeground }
      : { stack: view.observations.map((item) => observation(item, names)) },
  ];
}

const RANKING_HEADERS = [
  'Pos.',
  'Cajero',
  'Tickets',
  'Activadas',
  'Aceptadas',
  'Efectividad',
  'Podio',
];

function rankingRow(entry: RankingEntry, view: AnalysisView, meta: ReportMeta): TableCell[] {
  const number = (text: string): TableCell => ({ text, alignment: 'right' });
  const cashier: TableCell =
    view.branchCodes.length > 1
      ? {
          stack: [
            { text: entry.cashierName },
            { text: formatBranches(entry.branchCodes, meta.branchNames), style: 'caption' },
          ],
        }
      : { text: entry.cashierName };
  const eligibility: TableCell = entry.eligible
    ? { text: 'Participa', color: COLOR.success, bold: true }
    : {
        stack: [
          { text: 'No participa', bold: true },
          ...entry.ineligibilityReasons.map((reason) => ({
            text: reason.message,
            style: 'caption',
          })),
        ],
      };
  return [
    { text: String(entry.position) },
    cashier,
    number(formatInteger(entry.tickets)),
    number(formatInteger(entry.activadas)),
    number(formatInteger(entry.aceptadas)),
    entry.effectiveness === null
      ? { text: formatPercent(null), alignment: 'right', color: COLOR.mutedForeground }
      : number(formatPercent(entry.effectiveness)),
    eligibility,
  ];
}

function ranking(view: AnalysisView, meta: ReportMeta): Content[] {
  const header = RANKING_HEADERS.map((text, index): TableCell => ({
    text,
    style: 'tableHeader',
    alignment: index >= 2 && index <= 5 ? 'right' : 'left',
  }));
  return [
    sectionTitle('Ranking'),
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [24, '*', 44, 50, 50, 58, 110],
        body: [header, ...view.ranking.map((entry) => rankingRow(entry, view, meta))],
      },
      layout: GRID_LAYOUT,
    },
  ];
}

/**
 * Pure: the pdfmake document of one analysis view, in the dashboard order (summary → podium →
 * observations → ranking). It only lays out the view; every figure comes from the analysis.
 */
export function buildReportDocDefinition(
  view: AnalysisView,
  meta: ReportMeta,
): TDocumentDefinitions {
  const body: Content[] =
    view.ranking.length === 0
      ? [
          sectionTitle('Cajeros'),
          { text: EMPTY_VIEW_TEXT, color: COLOR.mutedForeground },
          ...observations(view),
        ]
      : [...podium(view), ...observations(view), ...ranking(view, meta)];

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 56],
    info: {
      title: `${REPORT_TITLE} · ${view.label}`,
      author: 'Grido Analytics',
      creator: 'Grido Analytics',
    },
    content: [...heading(view, meta), ...summary(view, meta), ...body],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: PODIUM_REQUIREMENTS, width: '*' },
        { text: `Página ${currentPage} de ${pageCount}`, width: 'auto', alignment: 'right' },
      ],
      margin: [40, 16, 40, 0],
      fontSize: 8,
      color: COLOR.mutedForeground,
    }),
    defaultStyle: { font: 'Roboto', fontSize: 9, color: COLOR.foreground, lineHeight: 1.15 },
    styles: {
      title: { fontSize: 18, bold: true, color: COLOR.primary },
      subtitle: { fontSize: 12, bold: true, margin: [0, 4, 0, 2] },
      section: { fontSize: 13, bold: true, color: COLOR.primary, margin: [0, 16, 0, 6] },
      caption: { fontSize: 8, color: COLOR.mutedForeground },
      cardLabel: { fontSize: 8, color: COLOR.mutedForeground },
      cardValue: { fontSize: 14, bold: true, margin: [0, 2, 0, 2] },
      podiumName: { fontSize: 11, bold: true, margin: [0, 2, 0, 0] },
      podiumValue: { fontSize: 16, bold: true, margin: [0, 2, 0, 2] },
      badge: { fontSize: 8, bold: true },
      tableHeader: {
        bold: true,
        color: COLOR.primaryForeground,
        fillColor: COLOR.primary,
      },
    },
  };
}
