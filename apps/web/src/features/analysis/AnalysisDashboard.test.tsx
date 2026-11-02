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
});
