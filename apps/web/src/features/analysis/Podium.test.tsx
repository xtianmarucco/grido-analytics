import type { PodiumStep } from '@grido/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ana, carla, entry, podium } from './fixtures';
import { Podium } from './Podium';

type Steps = [PodiumStep, PodiumStep, PodiumStep];

function step(position: number): HTMLElement {
  const item = screen.getByRole('heading', { name: `${position}.º puesto` }).closest('li');
  if (!item) throw new Error(`No step ${position}`);
  return item;
}

describe('Podium', () => {
  it('lists the steps in reading order 1, 2, 3 with the filled cashiers', () => {
    render(<Podium steps={podium()} />);

    const list = screen.getByRole('list', { name: 'Podio' });
    expect(
      within(list)
        .getAllByRole('heading')
        .map((h) => h.textContent),
    ).toEqual(['1.º puesto', '2.º puesto', '3.º puesto']);
    expect(step(1)).toHaveTextContent('Carla');
    expect(step(1)).toHaveTextContent('18,87 %');
    expect(step(1)).toHaveTextContent('10 aceptadas de 53 activadas');
    expect(step(2)).toHaveTextContent('Ana');
    expect(step(2)).toHaveTextContent('1,92 %');
  });

  it('explains a vacant step and the podium requirements', () => {
    render(<Podium steps={podium()} />);

    expect(step(3)).toHaveTextContent(
      'Puesto vacante: no hay suficientes cajeros que cumplan los requisitos del podio.',
    );
    expect(
      screen.getByText(
        'Requisitos: al menos 30 tickets, una sobreventa aceptada y efectividad calculable.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a shared step and the step it covers', () => {
    const bruno = entry({ cashierName: 'Bruno', position: 2, aceptadas: 1, activadas: 52 });
    const steps: Steps = [
      { position: 1, status: 'filled', cashiers: [carla] },
      { position: 2, status: 'filled', cashiers: [ana, bruno] },
      { position: 3, status: 'covered-by-tie', cashiers: [] },
    ];
    render(<Podium steps={steps} />);

    expect(step(2)).toHaveTextContent('Ana');
    expect(step(2)).toHaveTextContent('Bruno');
    expect(within(step(2)).getByText('Empate')).toBeInTheDocument();
    expect(step(2)).toHaveTextContent('Comparten el 2.º puesto con el mismo resultado.');
    expect(step(3)).toHaveTextContent(
      'Sin 3.º puesto: el empate en el 2.º puesto ocupa este lugar.',
    );
    expect(within(step(1)).queryByText('Empate')).not.toBeInTheDocument();
  });

  it('names the tie that covers several steps', () => {
    const tied = [carla, { ...ana, position: 1 }, entry({ cashierName: 'Bruno' })];
    const steps: Steps = [
      { position: 1, status: 'filled', cashiers: tied },
      { position: 2, status: 'covered-by-tie', cashiers: [] },
      { position: 3, status: 'covered-by-tie', cashiers: [] },
    ];
    render(<Podium steps={steps} />);

    expect(step(1)).toHaveTextContent('Comparten el 1.º puesto con el mismo resultado.');
    expect(step(2)).toHaveTextContent(
      'Sin 2.º puesto: el empate en el 1.º puesto ocupa este lugar.',
    );
    expect(step(3)).toHaveTextContent(
      'Sin 3.º puesto: el empate en el 1.º puesto ocupa este lugar.',
    );
  });
});
