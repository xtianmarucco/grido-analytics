# API contract

Base: same origin, prefix `/api`. Schemas live in `packages/shared` (zod) and are the source of
truth for both sides.

| Method | Path                | Status      | Sprint |
| ------ | ------------------- | ----------- | ------ |
| GET    | `/api/health`       | Implemented | 1      |
| POST   | `/api/analysis`     | Implemented | 2 (+3) |
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

| Code                    | Status | When                                                              | `details`                                   |
| ----------------------- | ------ | ----------------------------------------------------------------- | ------------------------------------------- |
| `NOT_FOUND`             | 404    | Unknown `/api/*` route (also unknown routes without a web build)  | `{ method, path }`                          |
| `INTERNAL_ERROR`        | 500    | Any unexpected error. Generic message; no stack, no internals.    | —                                           |
| `FILE_REQUIRED`         | 400    | No `file` field (or not a multipart body)                         | —                                           |
| `INVALID_UPLOAD`        | 400    | Malformed multipart, more than one file, file in another field    | —                                           |
| `UNSUPPORTED_FILE_TYPE` | 415    | Not `.xlsx`: extension, MIME type or ZIP signature (`PK\x03\x04`) | —                                           |
| `FILE_TOO_LARGE`        | 413    | Upload over 5 MB, or declared uncompressed content over 64 MB     | `{ maxBytes }` / `{ maxUncompressedBytes }` |
| `UNREADABLE_FILE`       | 422    | Corrupt ZIP, or a ZIP without a worksheet                         | —                                           |
| `EMPTY_FILE`            | 422    | Empty first worksheet, or header without data rows                | —                                           |
| `MISSING_COLUMNS`       | 422    | Required columns absent                                           | `{ missing: string[] }`                     |
| `MULTIPLE_PERIODS`      | 422    | Rows with different `desde` / `hasta` dates                       | `{ periods: { from, to }[] }`               |
| `TOO_MANY_ROWS`         | 422    | More than 10 000 data rows                                        | `{ maxRows }`                               |
| `NO_VALID_ROWS`         | 422    | Every row was excluded                                            | `{ warnings, summary }`                     |

`details` is optional. Clients branch on `code`, never on `message`. Import messages are neutral
Spanish and are shown to the user as-is; `NOT_FOUND` and `INTERNAL_ERROR` keep English messages
and the web replaces them with its own copy.

## GET /api/health

```json
{ "status": "ok", "service": "grido-analytics-api", "timestamp": "2026-11-02T12:00:00.000Z" }
```

Schema: `healthResponseSchema`.

## POST /api/analysis

- Body: `multipart/form-data`, one file in field `file`: `.xlsx`, max 5 MB. Held in memory
  (multer `memoryStorage`); nothing is written to disk.
- Accepted MIME types: the `.xlsx` type, `application/octet-stream`, `application/zip`,
  `application/x-zip-compressed`, or empty. The bytes must start with the ZIP signature.
- 200 (schema `analysisResponseSchema`):

```json
{
  "import": {
    "period": { "from": "2026-10-19", "to": "2026-10-25" },
    "branches": [{ "code": 1, "name": "Almirante", "shiftCount": 14 }],
    "shifts": [
      {
        "row": 2,
        "turno": 101,
        "branchCode": 1,
        "branchName": "Almirante",
        "cashierKey": "ana",
        "cashierName": "Ana",
        "startedAt": "2026-10-19T13:38:00",
        "closedAt": "2026-10-19T21:05:00",
        "tickets": 40,
        "noActivadas": 10,
        "rechazadas": 20,
        "aceptadas": 10,
        "activadas": 30
      }
    ],
    "warnings": [
      {
        "code": "DUPLICATE_SHIFT",
        "message": "El turno 101 aparece 2 veces con los mismos datos (filas 2, 9). Se contó una sola vez.",
        "row": 2,
        "turno": 101
      }
    ],
    "summary": { "totalRows": 29, "includedRows": 28, "excludedRows": 1 }
  }
}
```

- `startedAt` / `closedAt`: local wall-clock time, `YYYY-MM-DDTHH:mm:ss`, no timezone. Format
  them by slicing the string; never pass them through `new Date()`.
- `period`: calendar dates from `desde` / `hasta`.
- Warning codes: `INVALID_VALUE`, `TICKET_MISMATCH`, `DUPLICATE_SHIFT`, `CONFLICTING_DUPLICATE`.
  Rules in [BACKEND_RULES.md](BACKEND_RULES.md).
- Sprint 3 adds a `views` key next to `import` (Almirante, Barranqueras, both). Additive: clients
  that only read `import` keep working.

## Drafts

### POST /api/exports/pdf · POST /api/exports/xlsx

- Body: `multipart/form-data`, fields `file` and `view` (`almirante` | `barranqueras` | `combined`).
- 200: the file as a download.
- The file is re-sent so the backend recomputes the analysis: it stays the single source of truth.
