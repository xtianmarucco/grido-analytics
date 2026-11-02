import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as renderUi, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AnalysisDashboard } from './AnalysisDashboard';
import { analysisResponse, view } from './fixtures';

/** The dashboard reads the report-download mutation state, so it needs a QueryClient. */
function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return renderUi(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const file = new File(['PK'], 'turnos.xlsx');

describe('AnalysisDashboard', () => {
  it('starts on the combined view and shows the period', () => {
    render(<AnalysisDashboard analysis={analysisResponse()} />);

    expect(screen.getByRole('radio', { name: 'Ambas sucursales' })).toBeChecked();
    expect(screen.getAllByText('19/10/2026 – 25/10/2026').length).toBeGreaterThan(0);
  });

  it('shows the cash control section right after the ranking', () => {
    render(<AnalysisDashboard analysis={analysisResponse()} />);

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles.indexOf('Control de caja')).toBe(titles.indexOf('Ranking') + 1);
    // Combined view: alerts carry the branch name.
    expect(screen.getAllByText(/^Almirante · /).length).toBeGreaterThan(0);
  });

  it('falls back to the first view when there is no combined view', () => {
    render(<AnalysisDashboard analysis={analysisResponse({ views: [view()] })} />);

    expect(screen.getByRole('radio', { name: 'Almirante' })).toBeChecked();
  });

  it('switches views without a new request and announces the change', async () => {
    render(<AnalysisDashboard analysis={analysisResponse()} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Barranqueras' }));

    expect(screen.getByRole('radio', { name: 'Barranqueras' })).toBeChecked();
    expect(screen.getByText('Mostrando Barranqueras')).toBeInTheDocument();
  });

  it('shows the summary of the selected view', async () => {
    const [almirante, , all] = analysisResponse().views;
    if (!almirante || !all) throw new Error('fixture');
    const analysis = analysisResponse({
      views: [
        { ...almirante, summary: { ...almirante.summary, tickets: 500 } },
        { ...all, summary: { ...all.summary, tickets: 2000 } },
      ],
    });
    render(<AnalysisDashboard analysis={analysis} />);
    const tickets = () => screen.getByRole('heading', { name: 'Tickets' }).closest('li');

    expect(tickets()).toHaveTextContent('2.000');
    await userEvent.click(screen.getByRole('radio', { name: 'Almirante' }));
    expect(tickets()).toHaveTextContent('500');
  });

  it('locks the view selector while a report is generating', async () => {
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise<Response>((resolve) => (finish = resolve))),
    );
    render(<AnalysisDashboard analysis={analysisResponse()} file={file} />);

    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF · Ambas sucursales' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Generando…');
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();

    finish(new Response('fail', { status: 500 }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeEnabled();
  });

  it('does not carry a report error over to another view', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<AnalysisDashboard analysis={analysisResponse()} file={file} />);

    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF · Ambas sucursales' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo generar el informe');

    await userEvent.click(screen.getByRole('radio', { name: 'Barranqueras' }));

    expect(screen.getByRole('button', { name: 'Descargar PDF · Barranqueras' })).toBeEnabled();
    expect(screen.queryByText('No se pudo generar el informe')).not.toBeInTheDocument();
  });
});
