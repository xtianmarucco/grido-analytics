import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EffectivenessChart } from './EffectivenessChart';
import { ana, carla, luis, marta } from './fixtures';

describe('EffectivenessChart', () => {
  it('has a caption and an accessible table with the same values, in ranking order', () => {
    render(<EffectivenessChart entries={[carla, ana, luis, marta]} />);

    const figure = screen.getByRole('figure', { name: 'Efectividad por cajero' });
    const table = within(figure).getByRole('table');
    const [, ...rows] = within(table).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Carla18,87 %',
      'Ana1,92 %',
      'Luis0,00 %',
      'MartaNo calculable',
    ]);
  });

  it('lists cashiers without a calculable value as text, without a bar', () => {
    render(<EffectivenessChart entries={[carla, ana, marta]} />);

    expect(
      within(screen.getByRole('list', { name: 'Sin efectividad calculable' })).getByRole(
        'listitem',
      ),
    ).toHaveTextContent('Marta: No calculable');
  });

  it('is replaced by a note when fewer than two cashiers have a calculable value', () => {
    render(<EffectivenessChart entries={[carla, marta]} />);

    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'El gráfico se muestra cuando al menos dos cajeros tienen efectividad calculable.',
      ),
    ).toBeInTheDocument();
  });
});
