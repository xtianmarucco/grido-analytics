import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CashControl, LIMITATION_NOTE } from './CashControl';
import { cashControl, emptyCashControl } from './fixtures';

describe('CashControl', () => {
  it('shows the section with the limitation note', () => {
    render(<CashControl cashControl={cashControl()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Control de caja' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Estos datos solo incluyen ventas tickeadas; las señales indican qué revisar, no prueban irregularidades.',
      ),
    ).toBeInTheDocument();
    expect(LIMITATION_NOTE).toContain('no prueban irregularidades');
  });

  it('lists each alerted shift with date, slot, cashier, difference and % of cash', () => {
    render(<CashControl cashControl={cashControl()} />);

    const list = screen.getByRole('list', { name: 'Diferencias de caja para revisar' });
    const [item] = within(list).getAllByRole('listitem');
    expect(item).toHaveTextContent('Señal para revisar');
    expect(item).toHaveTextContent('21/10 · Noche · Carla');
    expect(item).toHaveTextContent('-$ 6.000,00');
    expect(item).toHaveTextContent('3,81 % del efectivo');
    expect(item).toHaveTextContent('Conviene revisar el arqueo de ese turno.');
  });

  it('lists the low-cash signals with the API text', () => {
    render(<CashControl cashControl={cashControl()} />);

    const list = screen.getByRole('list', { name: 'Efectivo bajo frente al resto del horario' });
    const [item] = within(list).getAllByRole('listitem');
    expect(item).toHaveTextContent('Señal para revisar');
    expect(item).toHaveTextContent('Día · Ana');
    expect(item).toHaveTextContent('12,50 puntos menos');
    expect(item).toHaveTextContent('Ana cobró en efectivo el 30,00 % de sus ventas');
  });

  it('shows the branch of each signal in the combined view', () => {
    render(<CashControl cashControl={cashControl()} combined />);

    expect(screen.getAllByText(/Almirante · /).length).toBeGreaterThanOrEqual(2);
  });

  it('lists alerts with the same turno number from different branches separately', () => {
    const base = cashControl();
    const [alert] = base.shiftAlerts;
    if (!alert) throw new Error('fixture needs an alert');
    const other = { ...alert, branchCode: alert.branchCode + 1, branchName: 'Barranqueras' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<CashControl cashControl={{ ...base, shiftAlerts: [alert, other] }} combined />);

    const list = screen.getByRole('list', { name: 'Diferencias de caja para revisar' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('shows empty states when there are no signals', () => {
    render(<CashControl cashControl={emptyCashControl()} />);

    expect(screen.getAllByText('Sin señales esta semana')).toHaveLength(2);
    expect(screen.queryByText('Señal para revisar')).not.toBeInTheDocument();
  });

  it('shows the per-cashier indicators as a table and as phone cards', () => {
    render(<CashControl cashControl={cashControl()} />);

    const table = screen.getByRole('table');
    const carlaRow = within(table).getByRole('row', { name: /Carla/ });
    expect(carlaRow).toHaveTextContent('40,00 %');
    expect(carlaRow).toHaveTextContent('60,00 %');
    expect(carlaRow).toHaveTextContent('-$ 6.000,00');
    expect(carlaRow).toHaveTextContent('$ 3.000,00');
    expect(carlaRow).toHaveTextContent('Día 5,00 · Noche 3,13');
    const anaRow = within(table).getByRole('row', { name: /Ana/ });
    expect(anaRow).toHaveTextContent('No calculable');

    const cards = screen.getByRole('list', { name: 'Indicadores de caja por cajero' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(2);
    expect(within(cards).getAllByRole('listitem')[0]).toHaveTextContent('Efectivo 40,00 %');
  });

  it('never uses the destructive style', () => {
    const { container } = render(<CashControl cashControl={cashControl()} />);

    expect(container.innerHTML).not.toMatch(/destructive|red-/);
  });
});
