import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { views } from './fixtures';
import { ViewSelector } from './ViewSelector';

describe('ViewSelector', () => {
  it('offers one radio per API view, in API order, with the API labels', () => {
    render(<ViewSelector views={views} selectedId="all" onSelect={() => {}} />);

    const group = screen.getByRole('radiogroup', { name: 'Vista' });
    expect(group).toBeInTheDocument();
    const byName = (name: string) => screen.getByRole('radio', { name });
    expect(screen.getAllByRole('radio')).toEqual([
      byName('Almirante'),
      byName('Barranqueras'),
      byName('Ambas sucursales'),
    ]);
    expect(byName('Almirante')).not.toBeChecked();
    expect(byName('Barranqueras')).not.toBeChecked();
    expect(byName('Ambas sucursales')).toBeChecked();
  });

  it('reports the chosen view', async () => {
    const onSelect = vi.fn();
    render(<ViewSelector views={views} selectedId="all" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Barranqueras' }));

    expect(onSelect).toHaveBeenCalledWith('branch-2');
  });
});
