/**
 * Test fixtures typed from the shared contract. Fictitious names only (NF-6, D-16). The values
 * are hand-written as the API would return them; components never recompute them.
 */
import type {
  AnalysisResponse,
  AnalysisView,
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
