import { z } from 'zod';

/** Error codes the API currently emits. Later sprints add validation/import codes here. */
export const ErrorCode = {
  NotFound: 'NOT_FOUND',
  InternalError: 'INTERNAL_ERROR',
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
