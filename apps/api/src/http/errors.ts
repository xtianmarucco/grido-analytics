import { ErrorCode, type ErrorResponse } from '@grido/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';

/** An error whose status, code, message and details are safe to send to the client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function errorBody(code: string, message: string, details?: unknown): ErrorResponse {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** Catch-all for routes nobody handled. Mounted after every router. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res
    .status(404)
    .json(errorBody(ErrorCode.NotFound, 'Route not found', { method: req.method, path: req.path }));
};

/**
 * Last middleware. `HttpError`s are sent as-is; anything else is logged server-side and
 * answered with a generic 500 so stack traces and internal messages never reach the client.
 */
export function createErrorHandler(
  log: (error: unknown) => void = (error) => console.error(error),
): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json(errorBody(error.code, error.message, error.details));
      return;
    }
    log(error);
    res.status(500).json(errorBody(ErrorCode.InternalError, 'Unexpected server error'));
  };
}
