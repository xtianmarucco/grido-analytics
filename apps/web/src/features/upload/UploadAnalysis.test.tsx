import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { emptyView, views } from '@/features/analysis/fixtures';

import { UploadAnalysis } from './UploadAnalysis';

const shift = {
  row: 2,
  turno: 101,
  branchCode: 1,
  branchName: 'Almirante',
  cashierKey: 'ana',
  cashierName: 'Ana',
  startedAt: '2026-10-19T13:38:00',
  closedAt: '2026-10-19T21:05:00',
  tickets: 40,
  noActivadas: 10,
  rechazadas: 20,
  aceptadas: 7,
  activadas: 27,
};

function analysis(warnings: unknown[] = [], analysisViews: unknown[] = views) {
  return {
    import: {
      period: { from: '2026-10-19', to: '2026-10-25' },
      branches: [
        { code: 1, name: 'Almirante', shiftCount: 1 },
        { code: 2, name: 'Barranqueras', shiftCount: 1 },
      ],
      shifts: [
        shift,
        {
          ...shift,
          row: 3,
          turno: 102,
          branchCode: 2,
          branchName: 'Barranqueras',
          cashierKey: 'bruno',
          cashierName: 'Bruno',
        },
      ],
      warnings,
      summary: { totalRows: 2 + warnings.length, includedRows: 2, excludedRows: warnings.length },
    },
    views: analysisViews,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const excel = (name = 'turnos.xlsx') => new File(['PK'], name);

function renderUpload() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UploadAnalysis />
    </QueryClientProvider>,
  );
}

async function pick(file: File, label = 'Seleccionar archivo') {
  await userEvent.upload(screen.getByLabelText(label), file);
}

describe('UploadAnalysis', () => {
  it('starts idle with an accessible .xlsx picker', () => {
    renderUpload();

    const input = screen.getByLabelText('Seleccionar archivo');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', expect.stringContaining('.xlsx'));
    expect(screen.getByText(/arrastre el archivo/i)).toBeInTheDocument();
  });

  it('uploads the selected file and shows the processing state', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();

    const file = excel();
    await pick(file);

    expect(await screen.findByRole('status')).toHaveTextContent('Procesando turnos.xlsx');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.body as FormData).get('file')).toBe(file);
  });

  it('shows the dashboard on the combined view and keeps the preview in "Datos importados"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(analysis())));
    renderUpload();

    await pick(excel());

    expect(await screen.findByRole('status')).toHaveTextContent('2 turnos procesados');
    expect(screen.getByText('Procesado')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ambas sucursales' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Podio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Observaciones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Efectividad por cajero' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const imported = screen.getByText('Datos importados').closest('details');
    if (!imported) throw new Error('No "Datos importados" section');
    expect(imported).not.toHaveAttribute('open');
    expect(imported).toHaveTextContent('2 turnos · 0 advertencias');
    await userEvent.click(screen.getByText('Datos importados'));
    expect(imported).toHaveAttribute('open');
    expect(within(imported).getByText('19/10/2026 al 25/10/2026')).toBeInTheDocument();
    expect(within(imported).getByText('Almirante (1), Barranqueras (1)')).toBeInTheDocument();
    const rows = within(within(imported).getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(
      within(rows[1] as HTMLElement)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Almirante', '101', 'Ana', '19/10/2026 13:38', '40', '27', '7']);
  });

  it('downloads the report of the selected view, re-sending the uploaded file', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(analysis()))
      .mockReturnValueOnce(new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();
    const file = excel();

    await pick(file);
    await userEvent.click(await screen.findByRole('radio', { name: 'Barranqueras' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descargar Excel · Barranqueras' }));

    expect(screen.getByRole('button', { name: 'Descargar PDF · Barranqueras' })).toBeDisabled();
    const [path, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(path).toBe('/api/exports/xlsx');
    expect((init.body as FormData).get('file')).toBe(file);
    expect((init.body as FormData).get('view')).toBe('branch-2');
  });

  it('explains a view without cashiers', async () => {
    const analysisViews = [
      emptyView({ id: 'all', label: 'Ambas sucursales', branchCodes: [1, 2] }),
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(analysis([], analysisViews))));
    renderUpload();

    await pick(excel());

    expect(await screen.findByText('No hay cajeros con turnos en esta vista.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Podio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ranking' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tickets' }).closest('li')).toHaveTextContent('0');
  });

  it('lists warnings when some rows were excluded', async () => {
    const warnings = [
      { code: 'INVALID_VALUE', message: 'Fila 4: valor vacío o inválido en usulogin.', row: 4 },
      { code: 'DUPLICATE_SHIFT', message: 'El turno 9 aparece 2 veces.', row: 5, turno: 9 },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(analysis(warnings))));
    renderUpload();

    await pick(excel());

    expect(await screen.findByRole('status')).toHaveTextContent('2 advertencias');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Se procesó el archivo con 2 advertencias. Revíselas en «Datos importados».',
    );
    const imported = screen.getByText('Datos importados').closest('details');
    expect(imported).toHaveTextContent('2 advertencias');
    expect(imported).not.toHaveAttribute('open');

    await userEvent.click(within(alert).getByRole('link', { name: '«Datos importados»' }));

    expect(imported).toHaveAttribute('open');
    expect(screen.getByText('Fila 4: valor vacío o inválido en usulogin.')).toBeInTheDocument();
    expect(screen.getByText('El turno 9 aparece 2 veces.')).toBeInTheDocument();
  });

  it('shows the Spanish API message when the file is rejected, and allows choosing another', async () => {
    const envelope = {
      error: {
        code: 'UNSUPPORTED_FILE_TYPE',
        message: 'El archivo debe ser un Excel .xlsx (el reporte de cierre de turnos).',
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(envelope, 415)));
    renderUpload();

    await pick(excel('notas.xlsx'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo procesar notas.xlsx');
    expect(alert).toHaveTextContent('El archivo debe ser un Excel .xlsx');
    expect(screen.getByLabelText('Seleccionar otro archivo')).toBeEnabled();
  });

  it('shows the excluded-row warnings when no row was valid', async () => {
    const envelope = {
      error: {
        code: 'NO_VALID_ROWS',
        message: 'Ninguna fila del archivo es válida.',
        details: {
          warnings: [{ code: 'TICKET_MISMATCH', message: 'Fila 2: no coincide.', row: 2 }],
          summary: { totalRows: 1, includedRows: 0, excludedRows: 1 },
        },
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(envelope, 422)));
    renderUpload();

    await pick(excel());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ninguna fila del archivo es válida.',
    );
    expect(screen.getByText('Fila 2: no coincide.')).toBeInTheDocument();
  });

  it('explains in Spanish when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderUpload();

    await pick(excel());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    );
  });

  it('replaces the file after a successful upload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(analysis()))
      .mockResolvedValueOnce(json(analysis()));
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();

    await pick(excel('semana-1.xlsx'));
    await screen.findByText('semana-1.xlsx');
    const second = excel('semana-2.xlsx');
    await pick(second, 'Analizar otro archivo');

    expect(await screen.findByText('semana-2.xlsx')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((init.body as FormData).get('file')).toBe(second);
  });

  it('accepts a file dropped on the drop zone', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(analysis()));
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();

    const file = excel();
    fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files: [file] } });

    expect(await screen.findByText('Procesado')).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.body as FormData).get('file')).toBe(file);
  });
});
