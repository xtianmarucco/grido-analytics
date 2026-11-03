import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { sampleMeta, sampleView } from '../test-utils/fixtures.js';
import { MONEY_FORMAT, renderReportWorkbook } from './build-report-workbook.js';

/** First row whose column A holds `text`. */
function findRow(ws: ExcelJS.Worksheet, text: string): number {
  for (let row = 1; row <= ws.rowCount; row += 1) {
    if (ws.getCell(row, 1).value === text) return row;
  }
  throw new Error(`Missing row ${text}`);
}

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
  it('produces the five sheets in order', async () => {
    const workbook = await load('branch-1');

    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      'Resumen',
      'Ranking',
      'Podio',
      'Observaciones',
      'Control de caja',
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

  it('adds the cash control totals to the summary', async () => {
    const ws = sheet(await load('branch-1'), 'Resumen');

    expect(resumenValue(ws, 'Ventas').value).toBe(40000);
    expect(resumenValue(ws, 'Ventas').numFmt).toBe(MONEY_FORMAT);
    expect(resumenValue(ws, '% efectivo').value).toBeCloseTo(0.35, 12);
    expect(resumenValue(ws, '% efectivo').numFmt).toBe('0.00%');
    expect(resumenValue(ws, '% Club Grido').value).toBeCloseTo(0.6, 12);
    expect(resumenValue(ws, 'Diferencia de caja').value).toBe(-100);
    expect(resumenValue(ws, 'Diferencia de caja').numFmt).toBe(MONEY_FORMAT);
    expect(resumenValue(ws, 'Faltante').value).toBe(-100);
    expect(resumenValue(ws, 'Sobrante').value).toBe(0);
    expect(resumenValue(ws, 'Turnos a revisar').value).toBe(1);
    expect(resumenValue(ws, 'Ticket promedio').value).toBeCloseTo(40000 / 469, 10);
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

  it('lists the cash indicators per cashier with numbers stored as numbers', async () => {
    const ws = sheet(await load('branch-1'), 'Control de caja');

    expect(rowValues(ws, 1).slice(0, 7)).toEqual([
      'Cajero',
      'Sucursales',
      'Turnos',
      'Tickets',
      'Ventas',
      'Efectivo',
      '% efectivo',
    ]);
    const bruno = findRow(ws, 'Bruno');
    expect(ws.getCell(bruno, 5).value).toBe(10000);
    expect(ws.getCell(bruno, 5).numFmt).toBe(MONEY_FORMAT);
    expect(ws.getCell(bruno, 7).value).toBeCloseTo(0.2, 12);
    expect(ws.getCell(bruno, 7).numFmt).toBe('0.00%');
    const ana = findRow(ws, 'Ana');
    expect(ws.getCell(ana, 10).value).toBe(-100);
    expect(ws.getCell(ana, 14).value).toBe(1);
  });

  it('lists the alerted shifts and the low-cash signals with the limitation note', async () => {
    const ws = sheet(await load('branch-1'), 'Control de caja');

    const alerts = findRow(ws, 'Diferencias de caja para revisar');
    expect(rowValues(ws, alerts + 1).slice(0, 4)).toEqual([
      'Fecha',
      'Horario',
      'Sucursal',
      'Cajero',
    ]);
    const alert = rowValues(ws, alerts + 2);
    expect(alert.slice(0, 4)).toEqual(['21/10/2026', 'Día', 'Almirante', 'Ana']);
    expect(ws.getCell(alerts + 2, 6).value).toBe(-100);
    expect(ws.getCell(alerts + 2, 6).numFmt).toBe(MONEY_FORMAT);
    expect(ws.getCell(alerts + 2, 8).value).toBeCloseTo(0.025, 12);

    const signals = findRow(ws, 'Efectivo bajo frente al resto del horario');
    expect(rowValues(ws, signals + 1).slice(0, 6)).toEqual([
      'Sucursal',
      'Horario',
      'Cajero',
      'Cantidad de turnos',
      'Turnos',
      '% efectivo del cajero',
    ]);
    const signal = rowValues(ws, signals + 2);
    expect(signal.slice(0, 5)).toEqual(['Almirante', 'Día', 'Bruno', 1, 'lun 19/10 08:00']);
    expect(ws.getCell(signals + 2, 6).value).toBeCloseTo(0.2, 12);
    expect(ws.getCell(signals + 2, 7).value).toBeCloseTo(0.4, 12);

    findRow(
      ws,
      'Estos datos solo incluyen ventas tickeadas; las señales indican qué revisar, no prueban irregularidades.',
    );
  });

  it('says there are no signals when a block is empty', async () => {
    const ws = sheet(await load('branch-2'), 'Control de caja');

    const signals = findRow(ws, 'Efectivo bajo frente al resto del horario');
    expect(ws.getCell(signals + 1, 1).value).toBe('Sin señales esta semana');
  });
});
