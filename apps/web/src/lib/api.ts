import {
  type AnalysisResponse,
  analysisResponseSchema,
  errorResponseSchema,
  healthResponseSchema,
  type HealthResponse,
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
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

  if (!response.ok) {
    // The Vite dev proxy answers 5xx with a non-JSON body when Express is down.
    const envelope = errorResponseSchema.safeParse(body);
    if (envelope.success) {
      const { code, message, details } = envelope.data.error;
      throw new ApiError(code, message, response.status, details);
    }
    throw new ApiError(
      ClientErrorCode.NetworkError,
      `The server answered ${response.status}`,
      response.status,
    );
  }

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
