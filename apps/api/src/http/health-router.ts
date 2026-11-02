import type { HealthResponse } from '@grido/shared';
import { Router } from 'express';

export const SERVICE_NAME = 'grido-analytics-api';

export function createHealthRouter(now: () => Date = () => new Date()): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: now().toISOString(),
    };
    res.json(body);
  });

  return router;
}
