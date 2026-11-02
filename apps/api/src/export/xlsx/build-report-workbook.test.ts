import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { sampleMeta, sampleView } from '../test-utils/fixtures.js';
import { renderReportWorkbook } from './build-report-workbook.js';

async function load(id: string): Promise<ExcelJS.Workbook> {
  const buffer = await renderReportWorkbook(sampleView(id), sampleMeta);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

function sheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const found = workbook.getWorksheet(name);
  if (!found) throw new Error(`Missing sheet ${name}`);
  return found;
}

function rowValues(ws: ExcelJS.Worksheet, row: number): unknown[] {
  const values = ws.getRow(row).values as unknown[];
  return values.slice(1);
}

function resumenValue(ws: ExcelJS.Worksheet, label: string): ExcelJS.Cell {
  for (let row = 2; row <= ws.rowCount; row += 1) {
    if (ws.getCell(row, 1).value === label) return ws.getCell(row, 2);
  }
  throw new Error(`Missing Resumen row ${label}`);
}

describe('renderReportWorkbook', () => {
  it('produces the four sheets in order', async () => {
    const workbook = await load('branch-1');

    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      'Resumen',
      'Ranking',
      'Podio',
      'Observaciones',
    ]);
  });

  it('summarizes the view with numbers stored as numbers', async () => {
    const ws = sheet(await load('branch-1'), 'Resumen');

    expect(rowValues(ws, 1)).toEqual(['Concepto', 'Valor']);
    expect(resumenValue(ws, 'Vista').value).toBe('Almirante');
    expect(resumenValue(ws, 'Período').value).toBe('19/10/2026 – 25/10/2026');
    expect(resumenValue(ws, 'Tickets').value).toBe(469);
    expect(resumenValue(ws, 'Tickets').numFmt).toBeUndefined();
    expect(resumenValue(ws, 'Sobreventas activadas').value).toBe(419);
    expect(resumenValue(ws, 'Sobreventas aceptadas').value).toBe(41);
    expect(resumenValue(ws, 'Cajeros').value).toBe(4);
    expect(resumenValue(ws, 'Turnos').value).toBe(4);
    expect(resumenValue(ws, 'Generado').value).toBe('26/10/2026 09:05');
    const effectiveness = resumenValue(ws, 'Efectividad general');
    expect(effectiveness.value).toBeCloseTo(41 / 419, 12);
    expect(effectiveness.numFmt).toBe('0.00%');
  });

  it('lists the ranking with a bold frozen header, autofilter and reasons', async () => {
    const ws = sheet(await load('branch-1'), 'Ranking');

    expect(rowValues(ws, 1)).toEqual([
      'Posición',
      'Cajero',
      'Sucursales',
      'Turnos',
      'Tickets',
      'Activadas',
      'Aceptadas',
      'Efectividad',
      'Participa del podio',
      'Motivos',
    ]);
    expect(ws.getRow(1).font?.bold).toBe(true);
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(ws.autoFilter).toBe('A1:J5');
    expect(ws.rowCount).toBe(5);

    expect(rowValues(ws, 2)).toEqual([1, 'Ana', 'Almirante', 1, 239, 212, 40, 40 / 212, 'Sí']);
    expect(ws.getCell('H2').numFmt).toBe('0.00%');

    const fede = rowValues(ws, 5);
    expect(fede.slice(0, 2)).toEqual([4, 'Fede']);
    expect(fede[7]).toBe('No calculable');
    expect(fede[8]).toBe('No');
    expect(fede[9]).toBe(
      'Menos de 30 tickets; Sin sobreventas aceptadas; Efectividad no calculable',
    );
  });

  it('joins branch names in the combined view', async () => {
    const ws = sheet(await load('all'), 'Ranking');
    const dario = [2, 3, 4, 5, 6].map((row) => rowValues(ws, row)).find((r) => r[1] === 'Dario');

    expect(dario?.[2]).toBe('Almirante, Barranqueras');
    expect(dario?.[3]).toBe(2);
  });

  it('shows each podium step, including the vacant one', async () => {
    const ws = sheet(await load('branch-1'), 'Podio');

    expect(rowValues(ws, 1)).toEqual([
      'Puesto',
      'Estado',
      'Cajero',
      'Efectividad',
      'Tickets',
      'Activadas',
      'Aceptadas',
    ]);
    expect(rowValues(ws, 2)).toEqual(['1.º', 'Ocupado', 'Ana', 40 / 212, 239, 212, 40]);
    expect(rowValues(ws, 3).slice(0, 3)).toEqual(['2.º', 'Ocupado', 'Bruno']);
    expect(rowValues(ws, 4)).toEqual([
      '3.º',
      'Puesto vacante: no hay suficientes cajeros que cumplan los requisitos del podio.',
    ]);
    expect(ws.getCell('D2').numFmt).toBe('0.00%');
    expect(rowValues(ws, 6)).toEqual([
      'Requisitos: al menos 30 tickets, una sobreventa aceptada y efectividad calculable.',
    ]);
  });

  it('copies the observations as-is with Spanish titles', async () => {
    const view = sampleView('branch-1');
    const ws = sheet(await load('branch-1'), 'Observaciones');

    expect(rowValues(ws, 1)).toEqual([
      'Regla',
      'Título',
      'Cajero',
      'Dato',
      'Interpretación',
      'Recomendación',
    ]);
    expect(ws.rowCount).toBe(view.observations.length + 1);
    const first = view.observations[0];
    expect(rowValues(ws, 2)).toEqual([
      'O1',
      'Mejor resultado',
      'Ana',
      first?.fact,
      first?.interpretation,
      first?.recommendation,
    ]);
  });
});
