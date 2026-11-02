# API contract

Base: same origin, prefix `/api`. Schemas live in `packages/shared` (zod) and are the source of
truth for both sides.

| Method | Path                | Status      | Sprint |
| ------ | ------------------- | ----------- | ------ |
| GET    | `/api/health`       | Implemented | 1      |
| POST   | `/api/analysis`     | Implemented | 2 (+3) |
| POST   | `/api/exports/pdf`  | Implemented | 5      |
| POST   | `/api/exports/xlsx` | Implemented | 5      |

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

| Code                    | Status | When                                                               | `details`                                   |
| ----------------------- | ------ | ------------------------------------------------------------------ | ------------------------------------------- |
| `NOT_FOUND`             | 404    | Unknown `/api/*` route (also unknown routes without a web build)   | `{ method, path }`                          |
| `INTERNAL_ERROR`        | 500    | Any unexpected error. Generic message; no stack, no internals.     | —                                           |
| `FILE_REQUIRED`         | 400    | No `file` field (or not a multipart body)                          | —                                           |
| `INVALID_UPLOAD`        | 400    | Malformed multipart, more than one file, file in another field     | —                                           |
| `UNSUPPORTED_FILE_TYPE` | 415    | Not `.xlsx`: extension, MIME type or ZIP signature (`PK\x03\x04`)  | —                                           |
| `FILE_TOO_LARGE`        | 413    | Upload over 4 MB, or declared uncompressed content over 64 MB      | `{ maxBytes }` / `{ maxUncompressedBytes }` |
| `UNREADABLE_FILE`       | 422    | Corrupt ZIP, or a ZIP without a worksheet                          | —                                           |
| `EMPTY_FILE`            | 422    | Empty first worksheet, or header without data rows                 | —                                           |
| `MISSING_COLUMNS`       | 422    | Required columns absent                                            | `{ missing: string[] }`                     |
| `MULTIPLE_PERIODS`      | 422    | Rows with different `desde` / `hasta` dates                        | `{ periods: { from, to }[] }`               |
| `TOO_MANY_ROWS`         | 422    | More than 10 000 data rows                                         | `{ maxRows }`                               |
| `NO_VALID_ROWS`         | 422    | Every row was excluded                                             | `{ warnings, summary }`                     |
| `INVALID_VIEW`          | 400    | Export without a valid `view` id, or a view the file does not have | —                                           |

`details` is optional. Clients branch on `code`, never on `message`. Import messages are neutral
Spanish and are shown to the user as-is; `NOT_FOUND` and `INTERNAL_ERROR` keep English messages
and the web replaces them with its own copy.

## GET /api/health

```json
{ "status": "ok", "service": "grido-analytics-api", "timestamp": "2026-11-02T12:00:00.000Z" }
```

Schema: `healthResponseSchema`.

## POST /api/analysis

- Body: `multipart/form-data`, one file in field `file`: `.xlsx`, max 4 MB. Held in memory
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
        "activadas": 30,
        "venta": 132600.01,
        "turEfectivo": 52300.5,
        "ventaClubGrido": 80000,
        "turDiferencia": -1530,
        "slot": "dia"
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
- Money (Sprint 6, additive): pesos with cents as numbers; `turDiferencia` < 0 is a faltante.
  `slot` is `dia` (start before 15:00 wall clock) or `noche`.
- Warning codes: `INVALID_VALUE`, `TICKET_MISMATCH`, `DUPLICATE_SHIFT`, `CONFLICTING_DUPLICATE`.
  Rules in [BACKEND_RULES.md](BACKEND_RULES.md).
- `views` (Sprint 3, additive: clients that only read `import` keep working): one view per
  branch by code (`branch-<code>`), then `all`. Rules in [BUSINESS_RULES.md](BUSINESS_RULES.md). One view (observations shortened; O5 and O6 also apply here):

```json
{
  "id": "branch-1",
  "label": "Almirante",
  "branchCodes": [1],
  "summary": {
    "period": { "from": "2026-10-19", "to": "2026-10-25" },
    "cashierCount": 2,
    "shiftCount": 9,
    "tickets": 300,
    "activadas": 250,
    "aceptadas": 20,
    "effectiveness": 8
  },
  "ranking": [
    {
      "position": 1,
      "cashierKey": "ana",
      "cashierName": "Ana",
      "branchCodes": [1],
      "shiftCount": 5,
      "tickets": 230,
      "activadas": 212,
      "aceptadas": 20,
      "effectiveness": 9.433962264150944,
      "eligible": true,
      "ineligibilityReasons": []
    },
    {
      "position": 2,
      "cashierKey": "bruno",
      "cashierName": "Bruno",
      "branchCodes": [1],
      "shiftCount": 4,
      "tickets": 70,
      "activadas": 38,
      "aceptadas": 0,
      "effectiveness": 0,
      "eligible": false,
      "ineligibilityReasons": [{ "code": "NO_ACCEPTED", "message": "Sin sobreventas aceptadas" }]
    }
  ],
  "podium": [
    {
      "position": 1,
      "status": "filled",
      "cashiers": [{ "position": 1, "cashierKey": "ana", "...": "ranking entry" }]
    },
    { "position": 2, "status": "vacant", "cashiers": [] },
    { "position": 3, "status": "vacant", "cashiers": [] }
  ],
  "observations": [
    {
      "rule": "O1",
      "cashierKey": "ana",
      "fact": "Ana concretó 20 de 212 sobreventas activadas (9,43 %).",
      "interpretation": "Es el resultado más alto de la semana en Almirante.",
      "recommendation": "Invitar a Ana a compartir con el equipo cómo ofrece las sobreventas."
    }
  ]
}
```

- `effectiveness`: percent at full precision (round only for display); `null` = "No calculable".
- `ranking`: best first; `position` uses standard competition numbering (1, 2, 2, 4).
- `podium`: always three steps; `status` is `filled`, `covered-by-tie` or `vacant`. A podium
  cashier's `position` is its position among eligible cashiers.
- `observations[].rule`: `O1`–`O6`; `cashierKey` only on per-cashier rules. Show texts as-is.

### `cashControl` (Sprint 6)

Every view adds `cashControl` (additive; schema `cashControlSchema`). Rules in
[BUSINESS_RULES.md](BUSINESS_RULES.md#cash-control-sprint-6). Percentages are full precision
(`null` = "No calculable"); money in pesos with cents.

```json
{
  "summary": {
    "shiftCount": 9,
    "tickets": 300,
    "venta": 132600.01,
    "turEfectivo": 52300.5,
    "ventaClubGrido": 80000,
    "cashShare": 39.44,
    "clubShare": 60.33,
    "difference": {
      "net": -1530,
      "faltante": -1530,
      "sobrante": 0,
      "shiftsWithDifference": 1,
      "alertedShifts": 1
    },
    "averageTicket": 442,
    "hours": 60,
    "ticketsPerHour": 5
  },
  "cashiers": [
    {
      "cashierKey": "ana",
      "cashierName": "Ana",
      "branchCodes": [1],
      "...": "same fields as summary",
      "slots": [
        { "slot": "dia", "shiftCount": 3, "tickets": 120, "hours": 22.5, "ticketsPerHour": 5.33 }
      ]
    }
  ],
  "slots": [
    {
      "slot": "dia",
      "shiftCount": 5,
      "tickets": 180,
      "venta": 70000,
      "turEfectivo": 28000,
      "cashShare": 40,
      "hours": 35,
      "ticketsPerHour": 5.14
    }
  ],
  "shiftAlerts": [
    {
      "turno": 101,
      "branchCode": 1,
      "branchName": "Almirante",
      "cashierKey": "ana",
      "cashierName": "Ana",
      "startedAt": "2026-10-21T08:00:00",
      "slot": "dia",
      "difference": -1530,
      "turEfectivo": 52300.5,
      "percentOfCash": 2.93,
      "kind": "faltante",
      "message": "La diferencia de caja del turno fue -$ 1.530,00 (2,93 % del efectivo). Conviene revisar el arqueo de ese turno."
    }
  ],
  "lowCashSignals": [
    {
      "branchCode": 1,
      "branchName": "Almirante",
      "slot": "dia",
      "cashierKey": "bruno",
      "cashierName": "Bruno",
      "shiftCount": 1,
      "cashierShare": 25,
      "peersShare": 37.5,
      "gapPoints": 12.5,
      "message": "En Almirante (Día), Bruno cobró en efectivo el 25,00 % de sus ventas (1 turno); el resto de los cajeros de ese horario, el 37,50 % (12,50 puntos más). Conviene revisar cómo se registraron los cobros de esos turnos."
    }
  ]
}
```

- `cashiers` by `cashierKey` (merged across branches in `all`); `slots` `dia` first;
  `shiftAlerts` by `startedAt`, then `turno`; `lowCashSignals` by branch, slot, then gap.
- `percentOfCash` is `null` when the shift had no cash. Signals never mix branches; `all` lists
  the union of the branch signals.
- The new money columns are required: a file without them is 422 `MISSING_COLUMNS`.

## POST /api/exports/pdf · POST /api/exports/xlsx

- Body: `multipart/form-data`: field `file` (same rules as `/api/analysis`) and field `view`,
  the id of one analysis view (`branch-<code>` or `all`; schema `exportRequestFieldsSchema`).
- The file is re-sent so the backend recomputes the analysis: it stays the single source of
  truth (D-11). Nothing is stored; the report is built in memory.
- Checks, in order: file present → ZIP signature → `view` format → import (same errors as
  `/api/analysis`) → the view exists in the file. Both view failures are 400 `INVALID_VIEW`.
- 200 headers:

| Header                | PDF                                 | Excel                                                               |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `Content-Type`        | `application/pdf`                   | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `Content-Disposition` | `attachment; filename="<name>.pdf"` | `attachment; filename="<name>.xlsx"`                                |
| `Cache-Control`       | `no-store`                          | `no-store`                                                          |

- File name (`reportFileName`): `grido-informe-<slug>-<from>-al-<to>.<ext>`, slug from the view
  label (accents stripped, lowercase, hyphens): `grido-informe-ambas-sucursales-2026-10-19-al-2026-10-25.pdf`.
  Always ASCII, so no `filename*` is sent; the web parses either and falls back to the same name.
- PDF (A4 portrait): title "Informe semanal de sobreventas", view, period, generation date
  (`dd/mm/yyyy HH:mm`, server local time); Resumen; Podio (vacant / covered-by-tie texts);
  Observaciones (Dato / Interpretación / Recomendación); Ranking with eligibility reasons;
  Control de caja (limitation note, alerted shifts, low-cash signals, per-cashier table; the
  Resumen adds % efectivo, % Club Grido, Diferencia de caja, Ticket promedio, Tickets por hora,
  Turnos a revisar); footer with the podium requirements and "Página X de Y".
- Excel sheets: `Resumen`, `Ranking` (bold frozen header, autofilter), `Podio`,
  `Observaciones`, `Control de caja` (per-cashier indicators, then the blocks "Diferencias de
  caja para revisar" and "Efectivo bajo frente al resto del horario" — "Sin señales esta semana"
  when empty — and the limitation note). `Resumen` adds Ventas, % efectivo, % Club Grido,
  Diferencia de caja, Faltante, Sobrante, Turnos a revisar, Ticket promedio, Tickets por hora.
  Money cells are numbers with format `"$" #,##0.00`; percentages are fractions with `0.00%`;
  hours, tickets per hour and points use `0.00`. Counts are numbers; effectiveness is a fraction with format `0.00%`
  (`18.8679…` → `0.188679…`, shown `18.87%`); `null` is the text "No calculable".
