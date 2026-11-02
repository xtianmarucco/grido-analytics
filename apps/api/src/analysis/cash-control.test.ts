import { CashDifferenceKind, cashControlSchema, ShiftSlot } from '@grido/shared';
import { describe, expect, it } from 'vitest';

import { buildCashControl } from './cash-control.js';
import { shift } from './test-utils/builders.js';

const night = {
  slot: ShiftSlot.Night,
  startedAt: '2026-10-19T16:00:00',
  closedAt: '2026-10-19T23:00:00',
};
const barranqueras = { branchCode: 2, branchName: 'Barranqueras' };

describe('buildCashControl: summary', () => {
  it('sums money first and computes the shares on the totals', () => {
    const { summary } = buildCashControl([
      shift({ venta: 1000.1, turEfectivo: 400.05, ventaClubGrido: 600.1, tickets: 10 }),
      shift({ venta: 3000, turEfectivo: 600, ventaClubGrido: 1200, tickets: 30 }),
    ]);

    expect(summary).toMatchObject({
      shiftCount: 2,
      tickets: 40,
      venta: 4000.1,
      turEfectivo: 1000.05,
      ventaClubGrido: 1800.1,
    });
    expect(summary.cashShare).toBeCloseTo((1000.05 / 4000.1) * 100, 10);
    expect(summary.clubShare).toBeCloseTo((1800.1 / 4000.1) * 100, 10);
    expect(summary.averageTicket).toBeCloseTo(4000.1 / 40, 10);
  });

  it('measures hours on the wall clock and computes tickets per hour', () => {
    const { summary } = buildCashControl([
      shift({ startedAt: '2026-10-19T08:00:00', closedAt: '2026-10-19T15:30:00', tickets: 30 }),
      shift({ startedAt: '2026-10-19T22:00:00', closedAt: '2026-10-20T00:30:00', tickets: 20 }),
    ]);

    expect(summary.hours).toBe(10);
    expect(summary.ticketsPerHour).toBe(5);
  });

  it('returns null for indicators whose base is zero', () => {
    const { summary } = buildCashControl([
      shift({
        venta: 0,
        turEfectivo: 0,
        ventaClubGrido: 0,
        tickets: 0,
        noActivadas: 0,
        rechazadas: 0,
        aceptadas: 0,
        closedAt: '2026-10-19T08:00:00',
      }),
    ]);

    expect(summary).toMatchObject({
      cashShare: null,
      clubShare: null,
      averageTicket: null,
      hours: 0,
      ticketsPerHour: null,
    });
  });

  it('splits the cash-count difference into faltante and sobrante', () => {
    const { summary } = buildCashControl([
      shift({ turEfectivo: 100000, turDiferencia: -6000.4 }),
      shift({ turEfectivo: 100000, turDiferencia: 1600.15 }),
      shift({ turEfectivo: 100000, turDiferencia: -10 }),
      shift({ turEfectivo: 100000, turDiferencia: 0 }),
    ]);

    expect(summary.difference).toEqual({
      net: -4410.25,
      faltante: -6010.4,
      sobrante: 1600.15,
      shiftsWithDifference: 3,
      alertedShifts: 2,
    });
  });
});

describe('buildCashControl: shift alerts (1 % of the cash)', () => {
  it('flags a difference of exactly 1 % (inclusive, compared on cents)', () => {
    const { shiftAlerts } = buildCashControl([
      shift({ turno: 1, turEfectivo: 153000, turDiferencia: -1530 }),
    ]);

    expect(shiftAlerts).toHaveLength(1);
    expect(shiftAlerts[0]).toMatchObject({
      turno: 1,
      difference: -1530,
      turEfectivo: 153000,
      kind: CashDifferenceKind.Faltante,
      slot: ShiftSlot.Day,
    });
    expect(shiftAlerts[0]?.percentOfCash).toBeCloseTo(1, 10);
    expect(shiftAlerts[0]?.message).toBe(
      'La diferencia de caja del turno fue -$ 1.530,00 (1,00 % del efectivo). Conviene revisar el arqueo de ese turno.',
    );
  });

  it('does not flag a difference just below 1 %', () => {
    const { shiftAlerts } = buildCashControl([
      shift({ turEfectivo: 153000, turDiferencia: -1529.99 }),
      shift({ turEfectivo: 153000.01, turDiferencia: 1530 }),
    ]);

    expect(shiftAlerts).toEqual([]);
  });

  it('flags a sobrante as well', () => {
    const { shiftAlerts } = buildCashControl([shift({ turEfectivo: 1000, turDiferencia: 15 })]);

    expect(shiftAlerts[0]?.kind).toBe(CashDifferenceKind.Sobrante);
    expect(shiftAlerts[0]?.message).toContain('+$ 15,00 (1,50 % del efectivo)');
  });

  it('flags any difference in a shift without cash, with no percentage', () => {
    const { shiftAlerts } = buildCashControl([
      shift({ turno: 2, turEfectivo: 0, turDiferencia: 0.01 }),
      shift({ turno: 3, turEfectivo: 0, turDiferencia: 0 }),
    ]);

    expect(shiftAlerts.map((a) => [a.turno, a.percentOfCash])).toEqual([[2, null]]);
    expect(shiftAlerts[0]?.message).toBe(
      'La diferencia de caja del turno fue +$ 0,01 en un turno sin ventas en efectivo. Conviene revisar el arqueo de ese turno.',
    );
  });

  it('orders alerts by start time, then turno', () => {
    const { shiftAlerts } = buildCashControl([
      shift({ turno: 9, startedAt: '2026-10-20T08:00:00', turDiferencia: -500 }),
      shift({ turno: 8, startedAt: '2026-10-19T08:00:00', turDiferencia: -500 }),
      shift({ turno: 7, startedAt: '2026-10-20T08:00:00', turDiferencia: -500 }),
    ]);

    expect(shiftAlerts.map((a) => a.turno)).toEqual([8, 7, 9]);
  });
});

describe('buildCashControl: low-cash signals (10 points below slot peers)', () => {
  it('flags a cashier exactly 10 points below the peers of the same branch and slot', () => {
    const { lowCashSignals } = buildCashControl([
      shift({ cashierKey: 'ana', cashierName: 'Ana', venta: 10000, turEfectivo: 3000 }),
      shift({ cashierKey: 'bruno', cashierName: 'Bruno', venta: 6000, turEfectivo: 2400 }),
      shift({ cashierKey: 'carla', cashierName: 'Carla', venta: 4000, turEfectivo: 1600 }),
    ]);

    expect(lowCashSignals).toHaveLength(1);
    expect(lowCashSignals[0]).toMatchObject({
      branchCode: 1,
      branchName: 'Almirante',
      slot: ShiftSlot.Day,
      cashierKey: 'ana',
      shiftCount: 1,
      cashierShare: 30,
      peersShare: 40,
    });
    expect(lowCashSignals[0]?.gapPoints).toBeCloseTo(10, 10);
    expect(lowCashSignals[0]?.message).toBe(
      'En Almirante (Día), Ana cobró en efectivo el 30,00 % de sus ventas (1 turno); el resto de los cajeros de ese horario, el 40,00 % (10,00 puntos más). Conviene revisar cómo se registraron los cobros de esos turnos.',
    );
  });

  it('does not flag a gap of 9,99 points', () => {
    const { lowCashSignals } = buildCashControl([
      shift({ cashierKey: 'ana', venta: 10000, turEfectivo: 3001 }),
      shift({ cashierKey: 'bruno', venta: 10000, turEfectivo: 4000 }),
    ]);

    expect(lowCashSignals).toEqual([]);
  });

  it('compares only within the slot and needs peers', () => {
    const { lowCashSignals } = buildCashControl([
      shift({ cashierKey: 'ana', venta: 10000, turEfectivo: 1000 }),
      shift({ cashierKey: 'bruno', ...night, venta: 10000, turEfectivo: 9000 }),
    ]);

    expect(lowCashSignals).toEqual([]);
  });

  it('skips peers or cashiers without sales', () => {
    const { lowCashSignals } = buildCashControl([
      shift({ cashierKey: 'ana', venta: 0, turEfectivo: 0 }),
      shift({ cashierKey: 'bruno', venta: 10000, turEfectivo: 9000 }),
    ]);

    expect(lowCashSignals).toEqual([]);
  });

  it('never mixes branches: the combined view lists the union of branch signals', () => {
    const shifts = [
      shift({ cashierKey: 'ana', venta: 10000, turEfectivo: 1000 }),
      shift({ cashierKey: 'bruno', venta: 10000, turEfectivo: 5000 }),
      // Low share in Barranqueras, but no Barranqueras peer: no signal there.
      shift({ ...barranqueras, cashierKey: 'carla', venta: 10000, turEfectivo: 500 }),
      shift({ ...barranqueras, cashierKey: 'dario', ...night, venta: 10000, turEfectivo: 1000 }),
      shift({ ...barranqueras, cashierKey: 'eva', ...night, venta: 10000, turEfectivo: 3000 }),
    ];

    const combined = buildCashControl(shifts).lowCashSignals;
    const branch1 = buildCashControl(shifts.filter((s) => s.branchCode === 1)).lowCashSignals;
    const branch2 = buildCashControl(shifts.filter((s) => s.branchCode === 2)).lowCashSignals;

    expect(combined.map((s) => [s.branchCode, s.slot, s.cashierKey])).toEqual([
      [1, ShiftSlot.Day, 'ana'],
      [2, ShiftSlot.Night, 'dario'],
    ]);
    expect(combined).toEqual([...branch1, ...branch2]);
  });
});

describe('buildCashControl: cashiers and slots', () => {
  it('merges a cashier across branches and reports tickets per hour by slot', () => {
    const { cashiers, slots } = buildCashControl([
      shift({ cashierKey: 'dario', cashierName: 'Dario', tickets: 40, turDiferencia: -100 }),
      shift({ ...barranqueras, ...night, cashierKey: 'dario', cashierName: 'Dario', tickets: 70 }),
      shift({ cashierKey: 'ana', cashierName: 'Ana' }),
    ]);

    expect(cashiers.map((c) => c.cashierKey)).toEqual(['ana', 'dario']);
    const dario = cashiers[1];
    expect(dario).toMatchObject({
      branchCodes: [1, 2],
      shiftCount: 2,
      tickets: 110,
      venta: 20000,
      turEfectivo: 8000,
      cashShare: 40,
      clubShare: 60,
      averageTicket: 20000 / 110,
      hours: 14.5,
      difference: {
        net: -100,
        faltante: -100,
        sobrante: 0,
        shiftsWithDifference: 1,
        alertedShifts: 1,
      },
    });
    expect(dario?.slots).toEqual([
      { slot: ShiftSlot.Day, shiftCount: 1, tickets: 40, hours: 7.5, ticketsPerHour: 40 / 7.5 },
      { slot: ShiftSlot.Night, shiftCount: 1, tickets: 70, hours: 7, ticketsPerHour: 10 },
    ]);
    expect(slots.map((s) => [s.slot, s.shiftCount, s.tickets, s.cashShare])).toEqual([
      [ShiftSlot.Day, 2, 80, 40],
      [ShiftSlot.Night, 1, 70, 40],
    ]);
  });

  it('returns a contract-valid section', () => {
    const section = buildCashControl([shift(), shift({ ...night, turDiferencia: 300 })]);

    expect(cashControlSchema.parse(section)).toEqual(section);
  });
});
