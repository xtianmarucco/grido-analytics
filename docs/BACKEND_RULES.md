# Backend rules

How the API turns the uploaded Excel into normalized shifts (Sprint 2). Code:
`apps/api/src/import` (pure functions, no Express) and `apps/api/src/http` (adapters only).

## Pipeline

```text
multipart upload ──► upload checks ──► readShiftRows ──► normalizeShifts ──► { import }
 (http/upload.ts)    size, type,       ZIP guard,        row rules,
                     signature         first sheet,      duplicates,
                                       header, rows      period, branches
```

Everything happens in memory per request. Nothing is stored between requests.

## Upload checks (HTTP)

| Check                                                   | Result                      |
| ------------------------------------------------------- | --------------------------- |
| No `file` field                                         | 400 `FILE_REQUIRED`         |
| Several files, other field, malformed multipart         | 400 `INVALID_UPLOAD`        |
| Name not `.xlsx`, text MIME type, no `PK\x03\x04` start | 415 `UNSUPPORTED_FILE_TYPE` |
| Over 5 MB                                               | 413 `FILE_TOO_LARGE`        |

## Workbook checks (whole file rejected, 422 unless noted)

1. Declared uncompressed ZIP size over 64 MB → 413 `FILE_TOO_LARGE` (checked before inflating).
2. Corrupt ZIP or no worksheet → `UNREADABLE_FILE`.
3. Only the **first worksheet** is read. Empty → `EMPTY_FILE`.
4. Row 1 is the header. Missing required columns → `MISSING_COLUMNS` with the list.
5. Rows with no content are skipped (they are not data). No data rows → `EMPTY_FILE`.
6. More than 10 000 data rows → `TOO_MANY_ROWS`.
7. Distinct `desde` / `hasta` dates across rows → `MULTIPLE_PERIODS` (user-approved 2026-11-02).
8. No row left after the row rules → `NO_VALID_ROWS` (warnings in `details`).

## Row rules (row excluded or merged, always with a warning)

Applied in this order:

| Situation                                                           | Warning                 | Effect         |
| ------------------------------------------------------------------- | ----------------------- | -------------- |
| Empty or invalid required value (one warning lists every column)    | `INVALID_VALUE`         | Row excluded   |
| `turcierre` before `turiniciaturno`, or `desde` after `hasta`       | `INVALID_VALUE`         | Row excluded   |
| `sv_noactivada + sv_rechazada + sv_aceptada ≠ totaltiquets`         | `TICKET_MISMATCH`       | Row excluded   |
| Same `turno`, identical normalized data                             | `DUPLICATE_SHIFT`       | Counted once   |
| Same `turno`, differing data                                        | `CONFLICTING_DUPLICATE` | Every copy out |
| `sucursal` code seen earlier (sheet order) with another `succodigo` | `INVALID_VALUE`         | Row excluded   |

- Duplicates are compared after normalization, so `Ana` and `ana` are the same data.
- A copy excluded by an earlier rule does not count as a duplicate.
- Row numbers in warnings are 1-based sheet rows (header = row 1).
- `summary.excludedRows` = `totalRows − includedRows` (invalid rows plus merged copies).

## Normalization

| Field                    | Rule                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `cashierKey`             | `usulogin` trimmed and lowercased: the cashier identity               |
| `cashierName`            | `cashierKey` with the first letter uppercased (`carlos` → `Carlos`)   |
| `branchName`             | `succodigo` trimmed; `Barranquer` → `Barranqueras` (case-insensitive) |
| `activadas`              | `sv_rechazada + sv_aceptada`                                          |
| `startedAt` / `closedAt` | Wall-clock `YYYY-MM-DDTHH:mm:ss`, rounded to the nearest second       |
| `period.from` / `.to`    | Date part of `desde` / `hasta`                                        |

Shifts are sorted by branch code, then start, then `turno`. Branches are sorted by code.

## Messages

Codes are English and stable. Messages are neutral Spanish because the UI shows them as-is.
