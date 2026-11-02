import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ServerStatus } from './ServerStatus';

const healthy = { status: 'ok', service: 'grido-analytics-api', timestamp: '2026-11-02T12:00:00Z' };

function renderStatus() {
  // retry: false overrides the hook's retry so error tests are immediate.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ServerStatus />
    </QueryClientProvider>,
  );
}

function stubFetch(...results: Array<Response | Error>) {
  const fetchMock = vi.fn();
  for (const result of results) {
    if (result instanceof Error) fetchMock.mockRejectedValueOnce(result);
    else fetchMock.mockResolvedValueOnce(result);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ok = () => new Response(JSON.stringify(healthy), { status: 200 });

describe('ServerStatus', () => {
  it('shows the connected state with the last check time as a tooltip', async () => {
    stubFetch(ok());
    renderStatus();

    const badge = await screen.findByText('Conectado al servidor');
    expect(badge).toHaveAttribute('title', expect.stringMatching(/^Última verificación: /));
  });

  it('shows a clear error with a retry button when the API is down', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    renderStatus();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });

  it('recovers after retrying once the API is back', async () => {
    const fetchMock = stubFetch(new TypeError('Failed to fetch'), ok());
    renderStatus();

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Conectado al servidor')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
