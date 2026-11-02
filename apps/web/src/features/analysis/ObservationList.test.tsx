import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ana, carla, observations } from './fixtures';
import { ObservationList } from './ObservationList';

describe('ObservationList', () => {
  it('shows each API observation in order with Dato, Interpretación and Recomendación', () => {
    render(<ObservationList observations={observations} ranking={[carla, ana]} />);

    const items = within(screen.getByRole('list', { name: 'Observaciones' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    const [first, second] = items as [HTMLElement, HTMLElement];

    expect(within(first).getByRole('heading')).toHaveTextContent('Carla · Mejor resultado');
    const terms = within(first)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(terms).toEqual(['Dato', 'Interpretación', 'Recomendación']);
    const definitions = within(first)
      .getAllByRole('definition')
      .map((definition) => definition.textContent);
    expect(definitions).toEqual([
      'Carla concretó 10 de 53 sobreventas activadas (18,87 %).',
      'Es el resultado más alto de la vista.',
      'Reconocer el resultado y compartir cómo ofrece la sobreventa.',
    ]);

    expect(within(second).getByRole('heading')).toHaveTextContent('Podio incompleto');
  });

  it('titles every rule in Spanish', () => {
    const rules = ['O2', 'O3', 'O4', 'O5'] as const;
    render(
      <ObservationList
        observations={rules.map((rule) => ({
          rule,
          fact: 'f',
          interpretation: 'i',
          recommendation: 'r',
        }))}
        ranking={[]}
      />,
    );

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Observaciones',
      'Muchas oportunidades',
      'Diferencia entre resultados',
      'Buen resultado con poco volumen',
      'Sin sobreventas aceptadas',
    ]);
  });

  it('says so when the view has no observations', () => {
    render(<ObservationList observations={[]} ranking={[]} />);

    expect(screen.getByText('No hay observaciones para esta vista.')).toBeInTheDocument();
  });
});
