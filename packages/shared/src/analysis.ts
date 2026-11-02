import { z } from 'zod';

/**
 * Local wall-clock date-time as written by the source system (Argentina), without timezone,
 * rounded to the second: `YYYY-MM-DDTHH:mm:ss`. Never convert it with `new Date()`.
 */
export const wallClockDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'Expected YYYY-MM-DDTHH:mm:ss');

export type WallClockDateTime = z.infer<typeof wallClockDateTimeSchema>;

const count = z.number().int().nonnegative();

/** One shift after validation and normalization. */
export const normalizedShiftSchema = z.object({
  /** 1-based sheet row the shift came from (header = row 1). */
  row: z.number().int().min(2),
  turno: z.number().int().positive(),
  /** `sucursal` column. */
  branchCode: z.number().int().positive(),
  /** Display name derived from `succodigo` (e.g. `Barranquer` → `Barranqueras`). */
  branchName: z.string().min(1),
  /** Trimmed, lowercased `usulogin`: the cashier identity. */
  cashierKey: z.string().min(1),
  /** `cashierKey` with the first letter uppercased. */
  cashierName: z.string().min(1),
  startedAt: wallClockDateTimeSchema,
  closedAt: wallClockDateTimeSchema,
  /** `totaltiquets`. */
  tickets: count,
  /** `sv_noactivada`. */
  noActivadas: count,
  /** `sv_rechazada`. */
  rechazadas: count,
  /** `sv_aceptada`. */
  aceptadas: count,
  /** `rechazadas + aceptadas`. */
  activadas: count,
});

export type NormalizedShift = z.infer<typeof normalizedShiftSchema>;

/** Codes of row-level problems. Each one excludes or merges rows and is always reported. */
export const ImportWarningCode = {
  /** A required cell is empty or has an invalid value. The row is excluded. */
  InvalidValue: 'INVALID_VALUE',
  /** `sv_noactivada + sv_rechazada + sv_aceptada !== totaltiquets`. The row is excluded. */
  TicketMismatch: 'TICKET_MISMATCH',
  /** Same `turno` repeated with identical data. Counted once. */
  DuplicateShift: 'DUPLICATE_SHIFT',
  /** Same `turno` repeated with differing data. Every copy is excluded. */
  ConflictingDuplicate: 'CONFLICTING_DUPLICATE',
} as const;

export type ImportWarningCode = (typeof ImportWarningCode)[keyof typeof ImportWarningCode];

export const importWarningSchema = z.object({
  code: z.enum(ImportWarningCode),
  /** Spanish, user-facing. */
  message: z.string().min(1),
  /** 1-based sheet row, when the warning concerns one row (the first copy for duplicates). */
  row: z.number().int().min(2).optional(),
  turno: z.number().int().positive().optional(),
});

export type ImportWarning = z.infer<typeof importWarningSchema>;

export const importSummarySchema = z.object({
  /** Non-empty data rows read (header excluded). */
  totalRows: count,
  /** Shifts in `shifts`. */
  includedRows: count,
  /** `totalRows - includedRows`: invalid rows plus merged duplicate copies. */
  excludedRows: count,
});

export type ImportSummary = z.infer<typeof importSummarySchema>;

/** The `import` section of `POST /api/analysis`. */
export const importResultSchema = z.object({
  /** Report period from `desde` / `hasta`, as calendar dates (`YYYY-MM-DD`). */
  period: z.object({ from: z.iso.date(), to: z.iso.date() }),
  branches: z.array(
    z.object({
      code: z.number().int().positive(),
      name: z.string().min(1),
      shiftCount: count,
    }),
  ),
  shifts: z.array(normalizedShiftSchema),
  warnings: z.array(importWarningSchema),
  summary: importSummarySchema,
});

export type ImportResult = z.infer<typeof importResultSchema>;

/**
 * Effectiveness in percent (`aceptadas / activadas × 100`) at full precision, or `null` when the
 * cashier or view has no activadas ("No calculable"). Round only for display.
 */
export const effectivenessSchema = z.number().min(0).max(100).nullable();

export type Effectiveness = z.infer<typeof effectivenessSchema>;

/** Why a cashier cannot be on the podium. A cashier carries every reason that applies. */
export const EligibilityReasonCode = {
  /** Fewer than 30 tickets in the view. */
  MinTickets: 'MIN_TICKETS',
  /** No accepted upsell in the view. */
  NoAccepted: 'NO_ACCEPTED',
  /** No activadas, so effectiveness cannot be computed. */
  NotCalculable: 'NOT_CALCULABLE',
} as const;

export type EligibilityReasonCode =
  (typeof EligibilityReasonCode)[keyof typeof EligibilityReasonCode];

export const eligibilityReasonSchema = z.object({
  code: z.enum(EligibilityReasonCode),
  /** Spanish, user-facing. */
  message: z.string().min(1),
});

export type EligibilityReason = z.infer<typeof eligibilityReasonSchema>;

/** One cashier consolidated over every shift of a view. */
export const cashierTotalsSchema = z.object({
  cashierKey: z.string().min(1),
  /** Display name from the import (`cashierName`). */
  cashierName: z.string().min(1),
  /** Branches the cashier worked in within the view, ascending. */
  branchCodes: z.array(z.number().int().positive()).min(1),
  shiftCount: count,
  tickets: count,
  activadas: count,
  aceptadas: count,
  effectiveness: effectivenessSchema,
});

export type CashierTotals = z.infer<typeof cashierTotalsSchema>;

/** A ranked cashier. `position` uses standard competition numbering (1, 2, 2, 4). */
export const rankingEntrySchema = cashierTotalsSchema.extend({
  position: z.number().int().positive(),
  /** Podium-eligible: ≥ 30 tickets, ≥ 1 aceptada and calculable effectiveness. */
  eligible: z.boolean(),
  /** Empty when `eligible`. */
  ineligibilityReasons: z.array(eligibilityReasonSchema),
});

export type RankingEntry = z.infer<typeof rankingEntrySchema>;

/**
 * `filled`: at least one eligible cashier holds this position. `covered-by-tie`: no one holds it
 * because cashiers tied on a higher step use it up (two tied at 2nd → no 3rd). `vacant`: there
 * are not enough eligible cashiers.
 */
export const PodiumStepStatus = {
  Filled: 'filled',
  CoveredByTie: 'covered-by-tie',
  Vacant: 'vacant',
} as const;

export type PodiumStepStatus = (typeof PodiumStepStatus)[keyof typeof PodiumStepStatus];

export const podiumStepSchema = z.object({
  position: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.enum(PodiumStepStatus),
  /** Cashiers on this step (several when tied); empty unless `filled`. Their `position` is the podium one. */
  cashiers: z.array(rankingEntrySchema),
});

export type PodiumStep = z.infer<typeof podiumStepSchema>;

/** Deterministic observation rules (see docs/BUSINESS_RULES.md). */
export const ObservationRule = {
  /** A cashier at podium position 1. */
  TopResult: 'O1',
  /** Many opportunities, conversion below the view's general effectiveness. */
  ManyOpportunitiesLowConversion: 'O2',
  /** Best and worst calculable effectiveness ≥ 10 points apart. */
  RelevantGap: 'O3',
  /** Effectiveness ≥ the view's, with fewer than 30 tickets. */
  NotableLowVolume: 'O4',
  /** Activadas without any aceptada. */
  NoAccepted: 'O5',
  /** At least one podium step vacant for lack of eligible cashiers. */
  IncompletePodium: 'O6',
} as const;

export type ObservationRule = (typeof ObservationRule)[keyof typeof ObservationRule];

/** A deterministic observation. Spanish texts built by the backend; they never attribute causes. */
export const observationSchema = z.object({
  rule: z.enum(ObservationRule),
  /** Present when the observation concerns one cashier. */
  cashierKey: z.string().min(1).optional(),
  fact: z.string().min(1),
  interpretation: z.string().min(1),
  recommendation: z.string().min(1),
});

export type Observation = z.infer<typeof observationSchema>;

export const viewSummarySchema = z.object({
  period: importResultSchema.shape.period,
  cashierCount: count,
  shiftCount: count,
  tickets: count,
  activadas: count,
  aceptadas: count,
  /** On the view totals. */
  effectiveness: effectivenessSchema,
});

export type ViewSummary = z.infer<typeof viewSummarySchema>;

/** One analysis view: a single branch (`branch-<code>`) or every branch together (`all`). */
export const analysisViewSchema = z.object({
  id: z.string().regex(/^(branch-[1-9]\d*|all)$/, 'Expected branch-<code> or all'),
  /** Spanish, user-facing (`Almirante`, `Ambas sucursales`). */
  label: z.string().min(1),
  branchCodes: z.array(z.number().int().positive()).min(1),
  summary: viewSummarySchema,
  /** Every cashier of the view, best first. */
  ranking: z.array(rankingEntrySchema),
  /** Steps 1, 2 and 3, in that order. */
  podium: z.tuple([podiumStepSchema, podiumStepSchema, podiumStepSchema]),
  observations: z.array(observationSchema),
});

export type AnalysisView = z.infer<typeof analysisViewSchema>;

/**
 * Response of `POST /api/analysis`. Sprint 2 returned the `import` section; Sprint 3 adds the
 * analysis `views` next to it as a new key, so clients that only read `import` keep working.
 */
export const analysisResponseSchema = z.object({
  import: importResultSchema,
  /** One view per branch (by code), then the combined view. */
  views: z.array(analysisViewSchema),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
