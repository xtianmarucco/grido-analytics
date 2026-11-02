import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { cashControl, emptyCashControl, emptyView, view } from './fixtures';
import { SummaryCards } from './SummaryCards';

function card(title: string): HTMLElement {
  const item = screen.getByRole('heading', { name: title }).closest('li');
  if (!item) throw new Error(`No card titled ${title}`);
  return item;
}

describe('SummaryCards', () => {
  it('shows the ten API figures formatted for es-AR', () => {
    render(<SummaryCards summary={view().summary} cash={cashControl().summary} />);

    expect(screen.getAllByRole('heading')).toHaveLength(10);
    expect(card('Período')).toHaveTextContent('19/10/2026 – 25/10/2026');
    expect(card('Tickets')).toHaveTextContent('1.234');
    expect(card('Sobreventas activadas')).toHaveTextContent('117');
    expect(card('Sobreventas aceptadas')).toHaveTextContent('11');
    expect(card('Efectividad general')).toHaveTextContent('9,40 %');
    expect(card('Efectividad general')).toHaveTextContent('11 aceptadas de 117 activadas');
    expect(card('Cajeros')).toHaveTextContent('4');
    expect(card('Cajeros')).toHaveTextContent('16 turnos');
    expect(card('% efectivo')).toHaveTextContent('39,44 %');
    expect(card('% Club Grido')).toHaveTextContent('63,09 %');
    expect(card('Diferencia de caja')).toHaveTextContent('-$ 1.680,17');
    expect(card('Diferencia de caja')).toHaveTextContent(
      'Faltante -$ 9.870,40 · Sobrante +$ 2.619,76',
    );
    expect(card('Ticket promedio')).toHaveTextContent('$ 1.000,46');
  });

  it('shows "No calculable" and zeros for a view without activity', () => {
    render(<SummaryCards summary={emptyView().summary} cash={emptyCashControl().summary} />);

    expect(card('Efectividad general')).toHaveTextContent('No calculable');
    expect(card('Tickets')).toHaveTextContent('0');
    expect(card('Cajeros')).toHaveTextContent('0 turnos');
    expect(card('% efectivo')).toHaveTextContent('No calculable');
    expect(card('% Club Grido')).toHaveTextContent('No calculable');
    expect(card('Ticket promedio')).toHaveTextContent('No calculable');
    expect(card('Diferencia de caja')).toHaveTextContent('$ 0,00');
  });

  it('uses the singular for one shift', () => {
    render(
      <SummaryCards summary={{ ...view().summary, shiftCount: 1 }} cash={cashControl().summary} />,
    );

    expect(card('Cajeros')).toHaveTextContent('1 turno');
  });
});
