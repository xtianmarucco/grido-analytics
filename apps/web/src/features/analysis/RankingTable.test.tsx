import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ana, carla, entry, luis, marta } from './fixtures';
import { RankingTable } from './RankingTable';

const lucia = entry({ cashierName: 'Lucía', cashierKey: 'lucia', position: 5, tickets: 60 });
const entries = [carla, ana, luis, marta];

const table = () => screen.getByRole('table');
const cards = () => screen.getByRole('list', { name: 'Ranking de cajeros' });

/** Cell texts per body row, as the table shows them. */
function tableRows(): string[][] {
  const [, ...rows] = within(table()).getAllByRole('row');
  return rows.map((row) =>
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent ?? ''),
  );
}

const names = () => tableRows().map((cells) => cells[1]);

describe('RankingTable', () => {
  it('shows every cashier in API order with the backend positions and formatted figures', () => {
    render(<RankingTable entries={entries} />);

    expect(within(table()).getByText('Ranking de cajeros de la vista.')).toBeInTheDocument();
    const [first, , third, fourth] = tableRows();
    expect(first).toEqual(['1', 'Carla', '120', '53', '10', '18,87 %', 'Participa']);
    expect(third?.slice(0, 6)).toEqual(['3', 'Luis', '25', '12', '0', '0,00 %']);
    expect(third?.[6]).toContain('No participa');
    expect(third?.[6]).toContain('Menos de 30 tickets');
    expect(third?.[6]).toContain('Sin sobreventas aceptadas');
    expect(fourth?.[5]).toBe('No calculable');
    expect(fourth?.[6]).toContain('Efectividad no calculable');
  });

  it('shows the same position and "Empate" on tied rows', () => {
    render(<RankingTable entries={[carla, { ...ana, position: 1 }, luis]} />);

    const rows = tableRows();
    expect(rows.map((cells) => cells[0])).toEqual(['1Empate', '1Empate', '3']);
  });

  it('adds the branch names in the combined view', () => {
    render(
      <RankingTable
        entries={[{ ...carla, branchCodes: [1, 2] }]}
        branchNames={{ 1: 'Almirante', 2: 'Barranqueras' }}
      />,
    );

    expect(within(table()).getByText('Almirante, Barranqueras')).toBeInTheDocument();
  });

  it('filters by cashier name ignoring case and accents, for display only', async () => {
    render(<RankingTable entries={[...entries, lucia]} />);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar cajero' }), 'LUCIA');

    expect(names()).toEqual(['Lucía']);
    expect(tableRows()[0]?.[0]).toBe('5');
    expect(within(cards()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('explains when no cashier matches the search', async () => {
    render(<RankingTable entries={entries} />);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar cajero' }), 'zzz');

    expect(screen.getByText('Ningún cajero coincide con «zzz».')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('sorts by a column for display only and keeps the official positions', async () => {
    render(<RankingTable entries={entries} />);
    const tickets = screen.getByRole('button', { name: 'Tickets' });

    await userEvent.click(tickets);
    expect(tickets.closest('th')).toHaveAttribute('aria-sort', 'descending');
    expect(tableRows().map((cells) => [cells[0], cells[1]])).toEqual([
      ['2', 'Ana'],
      ['1', 'Carla'],
      ['3', 'Luis'],
      ['4', 'Marta'],
    ]);

    await userEvent.click(tickets);
    expect(tickets.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['Marta', 'Luis', 'Carla', 'Ana']);
    expect(
      screen.getByText(
        'El puesto oficial lo calcula el sistema; ordenar la tabla no cambia el ranking.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps "No calculable" last when sorting by effectiveness', async () => {
    render(<RankingTable entries={entries} />);
    const effectiveness = screen.getByRole('button', { name: 'Efectividad' });

    await userEvent.click(effectiveness);
    await userEvent.click(effectiveness);

    expect(names()).toEqual(['Luis', 'Ana', 'Carla', 'Marta']);
  });

  it('shows phone cards and sorts them with the "Ordenar por" select', async () => {
    render(<RankingTable entries={entries} />);

    const items = () => within(cards()).getAllByRole('listitem');
    expect(items()[0]).toHaveTextContent('Carla');
    expect(items()[0]).toHaveTextContent('18,87 %');
    expect(items()[2]).toHaveTextContent('Menos de 30 tickets');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ordenar por' }), 'Cajero');

    expect(items().map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Ana',
      'Carla',
      'Luis',
      'Marta',
    ]);
  });
});
