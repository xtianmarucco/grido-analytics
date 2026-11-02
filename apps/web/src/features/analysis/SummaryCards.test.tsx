import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { emptyView, view } from './fixtures';
import { SummaryCards } from './SummaryCards';

function card(title: string): HTMLElement {
  const item = screen.getByRole('heading', { name: title }).closest('li');
  if (!item) throw new Error(`No card titled ${title}`);
  return item;
}

describe('SummaryCards', () => {
  it('shows the six API figures formatted for es-AR', () => {
    render(<SummaryCards summary={view().summary} />);

    expect(screen.getAllByRole('heading')).toHaveLength(6);
    expect(card('Período')).toHaveTextContent('19/10/2026 – 25/10/2026');
    expect(card('Tickets')).toHaveTextContent('1.234');
    expect(card('Sobreventas activadas')).toHaveTextContent('117');
    expect(card('Sobreventas aceptadas')).toHaveTextContent('11');
    expect(card('Efectividad general')).toHaveTextContent('9,40 %');
    expect(card('Efectividad general')).toHaveTextContent('11 aceptadas de 117 activadas');
    expect(card('Cajeros')).toHaveTextContent('4');
    expect(card('Cajeros')).toHaveTextContent('16 turnos');
  });

  it('shows "No calculable" and zeros for a view without activity', () => {
    render(<SummaryCards summary={emptyView().summary} />);

    expect(card('Efectividad general')).toHaveTextContent('No calculable');
    expect(card('Tickets')).toHaveTextContent('0');
    expect(card('Cajeros')).toHaveTextContent('0 turnos');
  });

  it('uses the singular for one shift', () => {
    render(<SummaryCards summary={{ ...view().summary, shiftCount: 1 }} />);

    expect(card('Cajeros')).toHaveTextContent('1 turno');
  });
});
