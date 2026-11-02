import { describe, expect, it } from 'vitest';

import {
  analysisResponseSchema,
  analysisViewSchema,
  cashControlSchema,
  CashDifferenceKind,
  EligibilityReasonCode,
  ImportWarningCode,
  normalizedShiftSchema,
  ObservationRule,
  PodiumStepStatus,
  ShiftSlot,
  wallClockDateTimeSchema,
} from './analysis.js';
import { ErrorCode } from './http-error.js';

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
  aceptadas: 10,
  activadas: 30,
  venta: 132600.01,
  turEfectivo: 52300.5,
  ventaClubGrido: 80000,
  turDiferencia: -1530,
  slot: ShiftSlot.Day,
};

const response = {
  import: {
    period: { from: '2026-10-19', to: '2026-10-25' },
    branches: [{ code: 1, name: 'Almirante', shiftCount: 1 }],
    shifts: [shift],
    warnings: [
      {
        code: ImportWarningCode.InvalidValue,
        message: 'Fila 3: valor inválido en totaltiquets. La fila no se incluyó.',
        row: 3,
      },
    ],
    summary: { totalRows: 2, includedRows: 1, excludedRows: 1 },
  },
  views: [] as unknown[],
};

const anaEntry = {
  position: 1,
  cashierKey: 'ana',
  cashierName: 'Ana',
  branchCodes: [1],
  shiftCount: 1,
  tickets: 40,
  activadas: 30,
  aceptadas: 10,
  effectiveness: 33.333333333333336,
  eligible: true,
  ineligibilityReasons: [],
};

const view = {
  id: 'branch-1',
  label: 'Almirante',
  branchCodes: [1],
  summary: {
    period: { from: '2026-10-19', to: '2026-10-25' },
    cashierCount: 2,
    shiftCount: 2,
    tickets: 50,
    activadas: 30,
    aceptadas: 10,
    effectiveness: 33.333333333333336,
  },
  ranking: [
    anaEntry,
    {
      ...anaEntry,
      position: 2,
      cashierKey: 'bruno',
      cashierName: 'Bruno',
      tickets: 10,
      activadas: 0,
      aceptadas: 0,
      effectiveness: null,
      eligible: false,
      ineligibilityReasons: [
        { code: EligibilityReasonCode.MinTickets, message: 'Menos de 30 tickets' },
        { code: EligibilityReasonCode.NoAccepted, message: 'Sin sobreventas aceptadas' },
        { code: EligibilityReasonCode.NotCalculable, message: 'Efectividad no calculable' },
      ],
    },
  ],
  podium: [
    { position: 1, status: PodiumStepStatus.Filled, cashiers: [anaEntry] },
    { position: 2, status: PodiumStepStatus.Vacant, cashiers: [] },
    { position: 3, status: PodiumStepStatus.Vacant, cashiers: [] },
  ],
  observations: [
    {
      rule: ObservationRule.TopResult,
      cashierKey: 'ana',
      fact: 'Ana concretó 10 de 30 sobreventas activadas (33,33 %).',
      interpretation: 'Es el resultado más alto de la semana en Almirante.',
      recommendation: 'Invitar a Ana a compartir con el equipo cómo ofrece las sobreventas.',
    },
    {
      rule: ObservationRule.IncompletePodium,
      fact: 'Solo 1 de 3 posiciones del podio tienen cajeros elegibles.',
      interpretation: 'Pocos cajeros cumplen los requisitos de la semana.',
      recommendation: 'Revisar los motivos de no elegibilidad en el ranking.',
    },
  ],
  cashControl: {
    summary: {
      shiftCount: 2,
      tickets: 50,
      venta: 132600.01,
      turEfectivo: 52300.5,
      ventaClubGrido: 80000,
      cashShare: 39.44,
      clubShare: 60.33,
      difference: {
        net: -1530,
        faltante: -1530,
        sobrante: 0,
        shiftsWithDifference: 1,
        alertedShifts: 1,
      },
      averageTicket: 2652,
      hours: 7.5,
      ticketsPerHour: 6.67,
    },
    cashiers: [
      {
        cashierKey: 'ana',
        cashierName: 'Ana',
        branchCodes: [1],
        shiftCount: 1,
        tickets: 40,
        venta: 132600.01,
        turEfectivo: 52300.5,
        ventaClubGrido: 80000,
        cashShare: 39.44,
        clubShare: 60.33,
        difference: {
          net: -1530,
          faltante: -1530,
          sobrante: 0,
          shiftsWithDifference: 1,
          alertedShifts: 1,
        },
        averageTicket: 3315,
        hours: 7.5,
        ticketsPerHour: 5.33,
        slots: [
          { slot: ShiftSlot.Day, shiftCount: 1, tickets: 40, hours: 7.5, ticketsPerHour: 5.33 },
        ],
      },
    ],
    slots: [
      {
        slot: ShiftSlot.Day,
        shiftCount: 2,
        tickets: 50,
        venta: 132600.01,
        turEfectivo: 52300.5,
        cashShare: 39.44,
        hours: 7.5,
        ticketsPerHour: 6.67,
      },
    ],
    shiftAlerts: [
      {
        turno: 101,
        branchCode: 1,
        branchName: 'Almirante',
        cashierKey: 'ana',
        cashierName: 'Ana',
        startedAt: '2026-10-19T13:38:00',
        slot: ShiftSlot.Day,
        difference: -1530,
        turEfectivo: 52300.5,
        percentOfCash: 2.93,
        kind: CashDifferenceKind.Faltante,
        message: 'La diferencia de caja del turno fue -$ 1.530,00 (2,93 % del efectivo).',
      },
    ],
    lowCashSignals: [
      {
        branchCode: 1,
        branchName: 'Almirante',
        slot: ShiftSlot.Day,
        cashierKey: 'ana',
        cashierName: 'Ana',
        shiftCount: 1,
        cashierShare: 30,
        peersShare: 42.5,
        gapPoints: 12.5,
        message: 'En Almirante (Día), el efectivo de Ana fue 30,00 % de sus ventas.',
      },
    ],
  },
};

describe('wallClockDateTimeSchema', () => {
  it('accepts a local date-time without timezone', () => {
    expect(wallClockDateTimeSchema.parse('2026-10-19T13:38:00')).toBe('2026-10-19T13:38:00');
  });

  it.each(['2026-10-19T13:38:00Z', '2026-10-19T13:38:00.999', '2026-10-19 13:38', '19/10/2026'])(
    'rejects %s',
    (value) => {
      expect(wallClockDateTimeSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('normalizedShiftSchema', () => {
  it('accepts a normalized shift', () => {
    expect(normalizedShiftSchema.parse(shift)).toEqual(shift);
  });

  it('rejects negative or fractional counts', () => {
    expect(normalizedShiftSchema.safeParse({ ...shift, tickets: -1 }).success).toBe(false);
    expect(normalizedShiftSchema.safeParse({ ...shift, aceptadas: 1.5 }).success).toBe(false);
  });
});

describe('analysisResponseSchema', () => {
  it('accepts the import section', () => {
    expect(analysisResponseSchema.parse(response)).toEqual(response);
  });

  it('accepts a warning without row or turno', () => {
    const body = {
      ...response,
      import: {
        ...response.import,
        warnings: [{ code: ImportWarningCode.DuplicateShift, message: 'x' }],
      },
    };
    expect(analysisResponseSchema.safeParse(body).success).toBe(true);
  });

  it('rejects an unknown warning code', () => {
    const body = {
      ...response,
      import: { ...response.import, warnings: [{ code: 'SOMETHING', message: 'x' }] },
    };
    expect(analysisResponseSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a period that is not a calendar date', () => {
    const body = {
      ...response,
      import: { ...response.import, period: { from: '2026-10-19T00:00:00', to: '2026-10-25' } },
    };
    expect(analysisResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe('analysisResponseSchema: views', () => {
  it('accepts a response with views', () => {
    const body = { ...response, views: [view] };
    expect(analysisResponseSchema.parse(body)).toEqual(body);
  });

  it('requires the views key', () => {
    expect(analysisResponseSchema.safeParse({ import: response.import }).success).toBe(false);
  });
});

describe('analysisViewSchema', () => {
  it('accepts the combined view id', () => {
    expect(analysisViewSchema.safeParse({ ...view, id: 'all' }).success).toBe(true);
  });

  it('rejects an unknown view id', () => {
    expect(analysisViewSchema.safeParse({ ...view, id: 'almirante' }).success).toBe(false);
  });

  it('rejects a podium that does not have exactly three steps', () => {
    expect(analysisViewSchema.safeParse({ ...view, podium: view.podium.slice(0, 2) }).success).toBe(
      false,
    );
  });

  it('rejects an unknown podium status, eligibility reason or observation rule', () => {
    const badStep = {
      ...view,
      podium: [{ ...view.podium[0], status: 'empty' }, ...view.podium.slice(1)],
    };
    const badReason = {
      ...view,
      ranking: [
        { ...anaEntry, eligible: false, ineligibilityReasons: [{ code: 'X', message: 'x' }] },
      ],
    };
    const badRule = { ...view, observations: [{ ...view.observations[1], rule: 'O9' }] };
    expect(analysisViewSchema.safeParse(badStep).success).toBe(false);
    expect(analysisViewSchema.safeParse(badReason).success).toBe(false);
    expect(analysisViewSchema.safeParse(badRule).success).toBe(false);
  });

  it('accepts a not calculable effectiveness as null only', () => {
    const summary = { ...view.summary, effectiveness: null };
    expect(analysisViewSchema.safeParse({ ...view, summary }).success).toBe(true);
    const negative = { ...view.summary, effectiveness: -1 };
    expect(analysisViewSchema.safeParse({ ...view, summary: negative }).success).toBe(false);
  });
});

describe('normalizedShiftSchema: money and slot', () => {
  it('requires the money fields and the slot', () => {
    for (const key of ['venta', 'turEfectivo', 'ventaClubGrido', 'turDiferencia', 'slot']) {
      const { [key as keyof typeof shift]: _omitted, ...rest } = shift;
      expect(normalizedShiftSchema.safeParse(rest).success).toBe(false);
    }
  });

  it('accepts a negative difference but no negative sales or cash', () => {
    expect(normalizedShiftSchema.safeParse({ ...shift, turDiferencia: 1600 }).success).toBe(true);
    expect(normalizedShiftSchema.safeParse({ ...shift, venta: -1 }).success).toBe(false);
    expect(normalizedShiftSchema.safeParse({ ...shift, turEfectivo: -0.01 }).success).toBe(false);
    expect(normalizedShiftSchema.safeParse({ ...shift, ventaClubGrido: -5 }).success).toBe(false);
  });

  it('rejects an unknown slot', () => {
    expect(normalizedShiftSchema.safeParse({ ...shift, slot: 'tarde' }).success).toBe(false);
  });
});

describe('cashControlSchema', () => {
  it('accepts the cash control section of a view', () => {
    expect(cashControlSchema.parse(view.cashControl)).toEqual(view.cashControl);
  });

  it('accepts not calculable indicators as null', () => {
    const summary = {
      ...view.cashControl.summary,
      cashShare: null,
      clubShare: null,
      averageTicket: null,
      ticketsPerHour: null,
    };
    const alert = { ...view.cashControl.shiftAlerts[0], turEfectivo: 0, percentOfCash: null };
    const body = { ...view.cashControl, summary, shiftAlerts: [alert] };
    expect(cashControlSchema.safeParse(body).success).toBe(true);
  });

  it('rejects an unknown difference kind', () => {
    const alert = { ...view.cashControl.shiftAlerts[0], kind: 'robo' };
    expect(cashControlSchema.safeParse({ ...view.cashControl, shiftAlerts: [alert] }).success).toBe(
      false,
    );
  });

  it('is required on every view', () => {
    const { cashControl: _omitted, ...rest } = view;
    expect(analysisViewSchema.safeParse(rest).success).toBe(false);
  });
});

describe('ErrorCode', () => {
  it('includes the import rejection codes', () => {
    expect(ErrorCode).toMatchObject({
      FileRequired: 'FILE_REQUIRED',
      InvalidUpload: 'INVALID_UPLOAD',
      UnsupportedFileType: 'UNSUPPORTED_FILE_TYPE',
      FileTooLarge: 'FILE_TOO_LARGE',
      UnreadableFile: 'UNREADABLE_FILE',
      EmptyFile: 'EMPTY_FILE',
      MissingColumns: 'MISSING_COLUMNS',
      MultiplePeriods: 'MULTIPLE_PERIODS',
      TooManyRows: 'TOO_MANY_ROWS',
      NoValidRows: 'NO_VALID_ROWS',
    });
  });
});
