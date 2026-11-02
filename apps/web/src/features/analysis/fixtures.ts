/**
 * Test fixtures typed from the shared contract. Fictitious names only (NF-6, D-16). The values
 * are hand-written as the API would return them; components never recompute them.
 */
import type {
  AnalysisResponse,
  AnalysisView,
  CashControl,
  CashierCashIndicators,
  ImportResult,
  Observation,
  PodiumStep,
  RankingEntry,
} from '@grido/shared';

export const period = { from: '2026-10-19', to: '2026-10-25' };

export function entry(overrides: Partial<RankingEntry> = {}): RankingEntry {
  const name = overrides.cashierName ?? 'Carla';
  return {
    cashierKey: name.toLowerCase(),
    cashierName: name,
    branchCodes: [1],
    shiftCount: 4,
    tickets: 120,
    activadas: 53,
    aceptadas: 10,
    effectiveness: 18.867924528301888,
    position: 1,
    eligible: true,
    ineligibilityReasons: [],
    ...overrides,
  };
}

export const carla = entry();
export const ana = entry({
  cashierName: 'Ana',
  tickets: 140,
  activadas: 52,
  aceptadas: 1,
  effectiveness: 1.9230769230769231,
  position: 2,
});
export const luis = entry({
  cashierName: 'Luis',
  tickets: 25,
  activadas: 12,
  aceptadas: 0,
  effectiveness: 0,
  position: 3,
  eligible: false,
  ineligibilityReasons: [
    { code: 'MIN_TICKETS', message: 'Menos de 30 tickets' },
    { code: 'NO_ACCEPTED', message: 'Sin sobreventas aceptadas' },
  ],
});
export const marta = entry({
  cashierName: 'Marta',
  tickets: 8,
  activadas: 0,
  aceptadas: 0,
  effectiveness: null,
  position: 4,
  eligible: false,
  ineligibilityReasons: [
    { code: 'MIN_TICKETS', message: 'Menos de 30 tickets' },
    { code: 'NO_ACCEPTED', message: 'Sin sobreventas aceptadas' },
    { code: 'NOT_CALCULABLE', message: 'Efectividad no calculable' },
  ],
});

export const observations: Observation[] = [
  {
    rule: 'O1',
    cashierKey: 'carla',
    fact: 'Carla concretó 10 de 53 sobreventas activadas (18,87 %).',
    interpretation: 'Es el resultado más alto de la vista.',
    recommendation: 'Reconocer el resultado y compartir cómo ofrece la sobreventa.',
  },
  {
    rule: 'O6',
    fact: 'El 3.º puesto del podio quedó vacante.',
    interpretation: 'No hay suficientes cajeros que cumplan los requisitos.',
    recommendation: 'Revisar el volumen de tickets de la semana.',
  },
];

export function podium(
  steps: [PodiumStep, PodiumStep, PodiumStep] = [
    { position: 1, status: 'filled', cashiers: [carla] },
    { position: 2, status: 'filled', cashiers: [ana] },
    { position: 3, status: 'vacant', cashiers: [] },
  ],
): [PodiumStep, PodiumStep, PodiumStep] {
  return steps;
}

const noDifference = {
  net: 0,
  faltante: 0,
  sobrante: 0,
  shiftsWithDifference: 0,
  alertedShifts: 0,
};

export function cashier(overrides: Partial<CashierCashIndicators> = {}): CashierCashIndicators {
  const name = overrides.cashierName ?? 'Carla';
  return {
    cashierKey: name.toLowerCase(),
    cashierName: name,
    branchCodes: [1],
    shiftCount: 4,
    tickets: 120,
    venta: 360000,
    turEfectivo: 144000,
    ventaClubGrido: 216000,
    cashShare: 40,
    clubShare: 60,
    difference: noDifference,
    averageTicket: 3000,
    hours: 30,
    ticketsPerHour: 4,
    slots: [
      { slot: 'dia', shiftCount: 2, tickets: 70, hours: 14, ticketsPerHour: 5 },
      { slot: 'noche', shiftCount: 2, tickets: 50, hours: 16, ticketsPerHour: 3.125 },
    ],
    ...overrides,
  };
}

export function cashControl(overrides: Partial<CashControl> = {}): CashControl {
  return {
    summary: {
      shiftCount: 16,
      tickets: 1234,
      venta: 1234567.89,
      turEfectivo: 486913.56,
      ventaClubGrido: 778900.12,
      cashShare: 39.44,
      clubShare: 63.09,
      difference: {
        net: -1680.17,
        faltante: -9870.4,
        sobrante: 2619.76,
        shiftsWithDifference: 5,
        alertedShifts: 2,
      },
      averageTicket: 1000.46,
      hours: 120,
      ticketsPerHour: 10.28,
    },
    cashiers: [
      cashier({
        difference: {
          net: -6000,
          faltante: -6000,
          sobrante: 0,
          shiftsWithDifference: 1,
          alertedShifts: 1,
        },
      }),
      cashier({
        cashierName: 'Ana',
        cashShare: null,
        clubShare: null,
        averageTicket: null,
        ticketsPerHour: null,
        slots: [{ slot: 'dia', shiftCount: 1, tickets: 0, hours: 0, ticketsPerHour: null }],
      }),
    ],
    slots: [],
    shiftAlerts: [
      {
        turno: 101,
        branchCode: 1,
        branchName: 'Almirante',
        cashierKey: 'carla',
        cashierName: 'Carla',
        startedAt: '2026-10-21T16:00:00',
        slot: 'noche',
        difference: -6000,
        turEfectivo: 157480.31,
        percentOfCash: 3.81,
        kind: 'faltante',
        message:
          'La diferencia de caja del turno fue -$ 6.000,00 (3,81 % del efectivo). Conviene revisar el arqueo de ese turno.',
      },
    ],
    lowCashSignals: [
      {
        branchCode: 1,
        branchName: 'Almirante',
        slot: 'dia',
        cashierKey: 'ana',
        cashierName: 'Ana',
        shiftCount: 1,
        cashierShare: 30,
        peersShare: 42.5,
        gapPoints: 12.5,
        message:
          'En Almirante (Día), Ana cobró en efectivo el 30,00 % de sus ventas (1 turno); el resto de los cajeros de ese horario, el 42,50 % (12,50 puntos más). Conviene revisar cómo se registraron los cobros de esos turnos.',
      },
    ],
    ...overrides,
  };
}

export const emptyCashControl = (): CashControl =>
  cashControl({
    summary: {
      shiftCount: 0,
      tickets: 0,
      venta: 0,
      turEfectivo: 0,
      ventaClubGrido: 0,
      cashShare: null,
      clubShare: null,
      difference: noDifference,
      averageTicket: null,
      hours: 0,
      ticketsPerHour: null,
    },
    cashiers: [],
    shiftAlerts: [],
    lowCashSignals: [],
  });

export function view(overrides: Partial<AnalysisView> = {}): AnalysisView {
  const id = overrides.id ?? 'branch-1';
  return {
    id,
    label: 'Almirante',
    branchCodes: [1],
    summary: {
      period,
      cashierCount: 4,
      shiftCount: 16,
      tickets: 1234,
      activadas: 117,
      aceptadas: 11,
      effectiveness: 9.401709401709402,
    },
    ranking: [carla, ana, luis, marta],
    podium: podium(),
    observations,
    cashControl: cashControl(),
    ...overrides,
  };
}

export const emptyView = (overrides: Partial<AnalysisView> = {}): AnalysisView =>
  view({
    summary: {
      period,
      cashierCount: 0,
      shiftCount: 0,
      tickets: 0,
      activadas: 0,
      aceptadas: 0,
      effectiveness: null,
    },
    ranking: [],
    podium: podium([
      { position: 1, status: 'vacant', cashiers: [] },
      { position: 2, status: 'vacant', cashiers: [] },
      { position: 3, status: 'vacant', cashiers: [] },
    ]),
    observations: [],
    cashControl: emptyCashControl(),
    ...overrides,
  });

export const views: AnalysisView[] = [
  view(),
  view({ id: 'branch-2', label: 'Barranqueras', branchCodes: [2], ranking: [ana, luis] }),
  view({
    id: 'all',
    label: 'Ambas sucursales',
    branchCodes: [1, 2],
    ranking: [{ ...carla, branchCodes: [1, 2] }, ana, luis, marta],
  }),
];

export function importResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    period,
    branches: [
      { code: 1, name: 'Almirante', shiftCount: 1 },
      { code: 2, name: 'Barranqueras', shiftCount: 1 },
    ],
    shifts: [
      {
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
        venta: 120000,
        turEfectivo: 48000,
        ventaClubGrido: 70000,
        turDiferencia: 0,
        slot: 'dia',
      },
    ],
    warnings: [],
    summary: { totalRows: 1, includedRows: 1, excludedRows: 0 },
    ...overrides,
  };
}

export function analysisResponse(overrides: Partial<AnalysisResponse> = {}): AnalysisResponse {
  return { import: importResult(), views, ...overrides };
}
