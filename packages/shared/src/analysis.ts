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
 * Response of `POST /api/analysis`. Sprint 2 returns the `import` section; Sprint 3 adds the
 * analysis `views` next to it as a new key, so existing clients keep working.
 */
export const analysisResponseSchema = z.object({
  import: importResultSchema,
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
