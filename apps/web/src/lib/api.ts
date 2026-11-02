import {
  type AnalysisResponse,
  analysisResponseSchema,
  ErrorCode,
  errorResponseSchema,
  fileTooLargeMessage,
  healthResponseSchema,
  type HealthResponse,
  MAX_UPLOAD_BYTES,
  type ReportFormat,
  reportFileName,
} from '@grido/shared';

/** Client-side codes for failures that never reached (or never came back from) the API. */
export const ClientErrorCode = {
  NetworkError: 'NETWORK_ERROR',
  InvalidResponse: 'INVALID_RESPONSE',
} as const;

/** Any failed API call. `code` is the API error code, or a `ClientErrorCode`. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
    /** The envelope's `details`, when the API sent them. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** API codes whose `message` is user-facing Spanish copy (D-26). Others get web copy. */
const USER_FACING_CODES = new Set<string>(
  Object.values(ErrorCode).filter(
    (code) => code !== ErrorCode.NotFound && code !== ErrorCode.InternalError,
  ),
);

/** Whether the error's `message` can be shown to the user as-is. */
export function isUserFacingError(error: unknown): error is ApiError {
  return error instanceof ApiError && USER_FACING_CODES.has(error.code);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** The error of a non-2xx response: the API envelope, a platform 413, or a network error. */
function rejection(response: Response, body: unknown): ApiError {
  // The Vite dev proxy answers 5xx with a non-JSON body when Express is down.
  const envelope = errorResponseSchema.safeParse(body);
  if (envelope.success) {
    const { code, message, details } = envelope.data.error;
    return new ApiError(code, message, response.status, details);
  }
  // Vercel answers bodies over 4.5 MB itself (`FUNCTION_PAYLOAD_TOO_LARGE`, text/HTML): same
  // message as the API's own FILE_TOO_LARGE.
  if (response.status === 413) {
    return new ApiError(ErrorCode.FileTooLarge, fileTooLargeMessage(), 413, {
      maxBytes: MAX_UPLOAD_BYTES,
    });
  }
  return new ApiError(
    ClientErrorCode.NetworkError,
    `The server answered ${response.status}`,
    response.status,
  );
}

async function request<T>(
  path: string,
  parse: (body: unknown) => T,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError(ClientErrorCode.NetworkError, 'The server could not be reached');
  }

  const body = await readJson(response);

  if (!response.ok) throw rejection(response, body);

  try {
    return parse(body);
  } catch {
    throw new ApiError(
      ClientErrorCode.InvalidResponse,
      'Unexpected response from the server',
      response.status,
    );
  }
}

export function fetchHealth(): Promise<HealthResponse> {
  return request('/api/health', (body) => healthResponseSchema.parse(body));
}

/** Uploads the shift-close Excel. The browser sets the multipart boundary; never set it here. */
export function uploadAnalysis(file: File): Promise<AnalysisResponse> {
  const body = new FormData();
  body.append('file', file);
  return request('/api/analysis', (json) => analysisResponseSchema.parse(json), {
    method: 'POST',
    body,
  });
}

/**
 * The file name from a `Content-Disposition` header (`filename*` first, then `filename`), reduced
 * to its last path segment. `undefined` when absent or empty.
 */
export function fileNameFromDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  let name: string | undefined;
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)?.[1];
  if (extended) {
    try {
      name = decodeURIComponent(extended.trim());
    } catch {
      name = undefined;
    }
  }
  name ??= /filename\s*=\s*(?:"([^"]*)"|([^;]+))/i
    .exec(header)
    ?.slice(1)
    .find((group) => group !== undefined);
  const base = name?.trim().split(/[\\/]/).pop();
  return base ? base : undefined;
}

export interface ReportRequest {
  /** The uploaded Excel, re-sent so the backend recomputes the analysis (D-11). */
  file: File;
  viewId: string;
  format: ReportFormat;
  /** Selected view label and period, for the fallback file name. */
  report: { label: string; period: { from: string; to: string } };
}

export interface ReportDownload {
  blob: Blob;
  filename: string;
}

/** Requests a PDF or Excel report of one view. */
export async function downloadReport({
  file,
  viewId,
  format,
  report,
}: ReportRequest): Promise<ReportDownload> {
  const body = new FormData();
  body.append('view', viewId);
  body.append('file', file);

  let response: Response;
  try {
    response = await fetch(`/api/exports/${format}`, { method: 'POST', body });
  } catch {
    throw new ApiError(ClientErrorCode.NetworkError, 'The server could not be reached');
  }
  if (!response.ok) throw rejection(response, await readJson(response));

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    throw new ApiError(ClientErrorCode.NetworkError, 'The download was interrupted');
  }
  const filename =
    fileNameFromDisposition(response.headers.get('Content-Disposition')) ??
    reportFileName(report, format);
  return { blob, filename };
}
