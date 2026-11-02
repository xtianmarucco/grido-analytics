import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AnalysisDashboard } from './AnalysisDashboard';
import { analysisResponse, view } from './fixtures';

describe('AnalysisDashboard', () => {
  it('starts on the combined view and shows the period', () => {
    render(<AnalysisDashboard analysis={analysisResponse()} />);

    expect(screen.getByRole('radio', { name: 'Ambas sucursales' })).toBeChecked();
    expect(screen.getAllByText('19/10/2026 – 25/10/2026').length).toBeGreaterThan(0);
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
});
