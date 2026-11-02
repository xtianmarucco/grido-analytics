import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { view } from '@/features/analysis/fixtures';

import { ReportDownloads } from './ReportDownloads';

const file = new File(['PK'], 'turnos.xlsx');
const selected = view({ id: 'all', label: 'Ambas sucursales', branchCodes: [1, 2] });

function renderDownloads() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReportDownloads file={file} view={selected} />
    </QueryClientProvider>,
  );
}

/** Fresh stubs per test: a `URL` subclass (the real global is never mutated) and a click spy. */
function stubDownload() {
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:report');
  const revokeObjectURL = vi.fn((_url: string) => {});
  class StubURL extends URL {
    static override createObjectURL = createObjectURL;
    static override revokeObjectURL = revokeObjectURL;
  }
  vi.stubGlobal('URL', StubURL);
  // Restored by `vi.restoreAllMocks()` in the shared test setup.
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { createObjectURL, click };
}

const pdfButton = () => screen.getByRole('button', { name: 'Descargar PDF · Ambas sucursales' });
const excelButton = () =>
  screen.getByRole('button', { name: 'Descargar Excel · Ambas sucursales' });

describe('ReportDownloads', () => {
  it('offers both reports for the selected view', () => {
    renderDownloads();

    expect(pdfButton()).toBeEnabled();
    expect(excelButton()).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('sends the file and view id and disables both buttons while generating', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    renderDownloads();

    await userEvent.click(pdfButton());

    expect(await screen.findByRole('status')).toHaveTextContent('Generando…');
    expect(screen.getByRole('button', { name: /Generando/ })).toBeDisabled();
    expect(excelButton()).toBeDisabled();
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/exports/pdf');
    expect((init.body as FormData).get('file')).toBe(file);
    expect((init.body as FormData).get('view')).toBe('all');
  });

  it('downloads the file with the server name and re-enables the buttons', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('PK', {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="informe-servidor.xlsx"',
          },
        }),
      ),
    );
    const { createObjectURL, click } = stubDownload();
    renderDownloads();

    await userEvent.click(excelButton());

    await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('informe-servidor.xlsx');
    expect(excelButton()).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server message when the report cannot be generated', async () => {
    const envelope = {
      error: { code: 'INVALID_VIEW', message: 'La vista seleccionada no existe en este archivo.' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(envelope), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    renderDownloads();

    await userEvent.click(pdfButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo generar el informe');
    expect(alert).toHaveTextContent('La vista seleccionada no existe en este archivo.');
    expect(pdfButton()).toBeEnabled();
  });

  it('replaces generic server errors with Spanish copy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderDownloads();

    await userEvent.click(pdfButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );
  });
});
