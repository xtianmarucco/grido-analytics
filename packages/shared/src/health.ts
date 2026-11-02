import { z } from 'zod';

/** Response of `GET /api/health`. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  /** Server time when the response was produced, ISO 8601. */
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
