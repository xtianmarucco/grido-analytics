# API contract

Base: same origin, prefix `/api`. Schemas live in `packages/shared` (zod) and are the source of
truth for both sides.

| Method | Path                | Status      | Sprint |
| ------ | ------------------- | ----------- | ------ |
| GET    | `/api/health`       | Implemented | 1      |
| POST   | `/api/analysis`     | Draft       | 2–3    |
| POST   | `/api/exports/pdf`  | Draft       | 5      |
| POST   | `/api/exports/xlsx` | Draft       | 5      |

## Errors

Every non-2xx response:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found",
    "details": { "method": "GET", "path": "/api/nope" }
  }
}
```

| Code             | Status | When                                                             |
| ---------------- | ------ | ---------------------------------------------------------------- |
| `NOT_FOUND`      | 404    | Unknown `/api/*` route (also unknown routes without a web build) |
| `INTERNAL_ERROR` | 500    | Any unexpected error. Generic message; no stack, no internals.   |

`details` is optional. Clients branch on `code`, never on `message`.

## GET /api/health

```json
{ "status": "ok", "service": "grido-analytics-api", "timestamp": "2026-11-02T12:00:00.000Z" }
```

Schema: `healthResponseSchema`.

## Drafts

### POST /api/analysis

- Body: `multipart/form-data`, field `file` (`.xlsx`, max 5 MB, memory storage).
- 200: `{ period, views: { almirante, barranqueras, combined }, warnings }`.
- Rejections (unreadable file, missing required column) use the error envelope.

### POST /api/exports/pdf · POST /api/exports/xlsx

- Body: `multipart/form-data`, fields `file` and `view` (`almirante` | `barranqueras` | `combined`).
- 200: the file as a download.
- The file is re-sent so the backend recomputes the analysis: it stays the single source of truth.
