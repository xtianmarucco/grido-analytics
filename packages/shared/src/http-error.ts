import { z } from 'zod';

/** Error codes the API emits. Messages are Spanish (they reach the UI); codes stay English. */
export const ErrorCode = {
  NotFound: 'NOT_FOUND',
  InternalError: 'INTERNAL_ERROR',
  /** 400: the multipart request has no `file` field. */
  FileRequired: 'FILE_REQUIRED',
  /** 400: malformed multipart body, extra files or unexpected fields. */
  InvalidUpload: 'INVALID_UPLOAD',
  /** 415: not an `.xlsx` (extension, MIME type or ZIP signature). */
  UnsupportedFileType: 'UNSUPPORTED_FILE_TYPE',
  /** 413: upload over 5 MB, or workbook content too large once uncompressed. */
  FileTooLarge: 'FILE_TOO_LARGE',
  /** 422: the workbook cannot be read (corrupt or not a spreadsheet). */
  UnreadableFile: 'UNREADABLE_FILE',
  /** 422: no worksheet, no header or no data rows. */
  EmptyFile: 'EMPTY_FILE',
  /** 422: required columns absent. `details.missing: string[]`. */
  MissingColumns: 'MISSING_COLUMNS',
  /** 422: rows with different `desde` / `hasta`. `details.periods`. */
  MultiplePeriods: 'MULTIPLE_PERIODS',
  /** 422: more data rows than the import accepts. `details.maxRows`. */
  TooManyRows: 'TOO_MANY_ROWS',
  /** 422: every row was excluded. `details.warnings`, `details.summary`. */
  NoValidRows: 'NO_VALID_ROWS',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Body of every non-2xx API response: `{ error: { code, message, details? } }`. */
export const errorResponseSchema = z.object({
  error: z.object({
    /** Stable, machine-readable code (e.g. `NOT_FOUND`). Clients branch on this, not on `message`. */
    code: z.string().min(1),
    /** Human-readable summary. Never contains stack traces or internal details. */
    message: z.string().min(1),
    /** Optional structured context (e.g. the unmatched path, per-field problems). */
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
