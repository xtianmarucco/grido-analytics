import { type AnalysisView, PodiumStepStatus } from '@grido/shared';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces.js';
import { describe, expect, it } from 'vitest';

import { sampleMeta, sampleView } from '../test-utils/fixtures.js';
import { buildReportDocDefinition } from './build-report-doc-definition.js';

/** Every string in a doc-definition subtree, in document order. */
function texts(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (node !== null && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    return ['text', 'stack', 'columns', 'table', 'body', 'ul', 'ol'].flatMap((key) =>
      key in record ? texts(record[key]) : [],
    );
  }
  return [];
}

interface TableNode {
  table: { headerRows?: number; body: unknown[][] };
}

/** The table whose header row starts with `firstHeader`. */
function findTable(node: unknown, firstHeader: string): TableNode | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findTable(child, firstHeader);
      if (found) return found;
    }
    return undefined;
  }
  if (node === null || typeof node !== 'object') return undefined;
  const record = node as Record<string, unknown>;
  if ('table' in record) {
    const table = record as unknown as TableNode;
    if (texts(table.table.body[0]?.[0])[0] === firstHeader) return table;
  }
  for (const key of ['stack', 'columns', 'table', 'body']) {
    const found = key in record ? findTable(record[key], firstHeader) : undefined;
    if (found) return found;
  }
  return undefined;
}

function footerTexts(definition: TDocumentDefinitions, page: number, pages: number): string[] {
  const footer = definition.footer;
  if (typeof footer !== 'function') throw new Error('footer is not a function');
  return texts(footer(page, pages, { width: 595.28, height: 841.89, orientation: 'portrait' }));
}

const content = (view: AnalysisView) => buildReportDocDefinition(view, sampleMeta).content;

describe('buildReportDocDefinition', () => {
  it('lays out an A4 portrait document with the Roboto font', () => {
    const definition = buildReportDocDefinition(sampleView('branch-1'), sampleMeta);

    expect(definition.pageSize).toBe('A4');
    expect(definition.pageOrientation).toBe('portrait');
    expect(definition.defaultStyle).toMatchObject({ font: 'Roboto' });
    expect(definition.info?.title).toBe('Informe semanal de sobreventas · Almirante');
  });

  it('opens with the title, view, period and generation date', () => {
    const all = texts(content(sampleView('branch-1')));

    expect(all.slice(0, 3)).toEqual([
      'Informe semanal de sobreventas',
      'Almirante · 19/10/2026 – 25/10/2026',
      'Generado el 26/10/2026 09:05',
    ]);
  });

  it('keeps the dashboard section order', () => {
    const all = texts(content(sampleView('branch-1')));
    const order = ['Resumen', 'Podio', 'Observaciones', 'Ranking', 'Control de caja'].map((h) =>
      all.indexOf(h),
    );

    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('summarizes the view with es-AR numbers', () => {
    const all = texts(content(sampleView('branch-1')));

    expect(all).toEqual(expect.arrayContaining(['Tickets', '469', 'Efectividad general']));
    expect(all).toContain('9,79 %');
    expect(all).toContain('4 turnos');
  });

  it('adds the cash control totals to the summary', () => {
    const all = texts(content(sampleView('branch-1')));

    expect(all).toEqual(
      expect.arrayContaining(['% efectivo', '35,00 %', '% Club Grido', '60,00 %']),
    );
    expect(all).toEqual(expect.arrayContaining(['Diferencia de caja', '-$\u00a0100,00']));
    expect(all).toContain('Faltante -$\u00a0100,00 · Sobrante $\u00a00,00');
    expect(all).toEqual(expect.arrayContaining(['Ticket promedio', '$\u00a085,29']));
  });

  it('adds the cash control section with signals, per-cashier table and note', () => {
    const nodes = content(sampleView('branch-1'));
    const all = texts(nodes);

    expect(all).toContain(
      'Estos datos solo incluyen ventas tickeadas; las señales indican qué revisar, no prueban irregularidades.',
    );
    expect(all).toContain('Señal para revisar · 21/10 · Día · Ana');
    expect(all).toContain(
      'La diferencia de caja del turno fue -$\u00a0100,00 (2,50 % del efectivo). Conviene revisar el arqueo de ese turno.',
    );
    expect(all).toContain('Señal para revisar · Día · Bruno');
    const table = findTable(nodes, 'Cajero');
    expect(table?.table.headerRows).toBe(1);
    const bruno = table?.table.body.find((row) => texts(row)[0] === 'Bruno');
    expect(texts(bruno)).toEqual(expect.arrayContaining(['$\u00a010.000,00', '20,00 %']));
  });

  it('shows the empty state when a view has no signals', () => {
    const all = texts(content(sampleView('branch-2')));

    expect(all.filter((text) => text === 'Sin señales esta semana')).toHaveLength(2);
  });

  it('shows the branch of each signal in the combined view', () => {
    const all = texts(content(sampleView('all')));

    expect(all).toContain('Señal para revisar · Almirante · 21/10 · Día · Ana');
  });

  it('shows the podium steps, the vacant explanation and the requirements', () => {
    const all = texts(content(sampleView('branch-1')));

    expect(all).toEqual(expect.arrayContaining(['1.º puesto', 'Ana', '18,87 %']));
    expect(all).toContain('40 aceptadas de 212 activadas');
    expect(all).toContain(
      'Puesto vacante: no hay suficientes cajeros que cumplan los requisitos del podio.',
    );
    expect(all).toContain(
      'Requisitos: al menos 30 tickets, una sobreventa aceptada y efectividad calculable.',
    );
  });

  it('explains a step covered by a tie and marks the tie', () => {
    const base = sampleView('branch-1');
    const [first, second] = base.podium;
    const ana = first.cashiers[0];
    const bruno = second.cashiers[0];
    if (!ana || !bruno) throw new Error('fixture');
    const tied: AnalysisView = {
      ...base,
      podium: [
        first,
        {
          position: 2,
          status: PodiumStepStatus.Filled,
          cashiers: [bruno, { ...ana, position: 2 }],
        },
        { position: 3, status: PodiumStepStatus.CoveredByTie, cashiers: [] },
      ],
    };
    const all = texts(content(tied));

    expect(all).toContain('Empate');
    expect(all).toContain('Sin 3.º puesto: el empate en el 2.º puesto ocupa este lugar.');
  });

  it('lists the observations with their labels', () => {
    const view = sampleView('branch-1');
    const all = texts(content(view));

    expect(all).toContain('Ana · Mejor resultado');
    expect(all.filter((text) => text === 'Dato: ')).toHaveLength(view.observations.length);
    expect(all.filter((text) => text === 'Interpretación: ')).toHaveLength(
      view.observations.length,
    );
    expect(all.filter((text) => text === 'Recomendación: ')).toHaveLength(view.observations.length);
    expect(all).toContain(view.observations[0]?.fact);
  });

  it('prints the full ranking with a repeated header and eligibility reasons', () => {
    const view = sampleView('branch-1');
    const ranking = findTable(content(view), 'Pos.');

    expect(ranking?.table.headerRows).toBe(1);
    expect(ranking?.table.body).toHaveLength(view.ranking.length + 1);
    expect(texts(ranking?.table.body[0])).toEqual([
      'Pos.',
      'Cajero',
      'Tickets',
      'Activadas',
      'Aceptadas',
      'Efectividad',
      'Podio',
    ]);
    expect(texts(ranking?.table.body[1])).toEqual([
      '1',
      'Ana',
      '239',
      '212',
      '40',
      '18,87 %',
      'Participa',
    ]);
    expect(texts(ranking?.table.body[4])).toEqual([
      '4',
      'Fede',
      '10',
      '0',
      '0',
      'No calculable',
      'No participa',
      'Menos de 30 tickets',
      'Sin sobreventas aceptadas',
      'Efectividad no calculable',
    ]);
  });

  it('adds the branches of each cashier in the combined view', () => {
    const view = sampleView('all');
    const ranking = findTable(content(view), 'Pos.');
    const dario = ranking?.table.body.map(texts).find((row) => row.includes('Dario'));

    expect(dario).toContain('Almirante, Barranqueras');
  });

  it('replaces podium and ranking when the view has no cashiers', () => {
    const base = sampleView('branch-1');
    const empty: AnalysisView = {
      ...base,
      ranking: [],
      podium: [
        { position: 1, status: PodiumStepStatus.Vacant, cashiers: [] },
        { position: 2, status: PodiumStepStatus.Vacant, cashiers: [] },
        { position: 3, status: PodiumStepStatus.Vacant, cashiers: [] },
      ],
      observations: [],
    };
    const nodes: Content = content(empty);

    expect(texts(nodes)).toContain('No hay cajeros con turnos en esta vista.');
    expect(findTable(nodes, 'Pos.')).toBeUndefined();
  });

  it('numbers the pages and repeats the podium requirements in the footer', () => {
    const definition = buildReportDocDefinition(sampleView('branch-1'), sampleMeta);
    const footer = footerTexts(definition, 2, 3);

    expect(footer).toContain('Página 2 de 3');
    expect(footer).toContain(
      'Requisitos: al menos 30 tickets, una sobreventa aceptada y efectividad calculable.',
    );
  });
});
