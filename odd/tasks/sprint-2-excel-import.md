# Feature: sprint-2-excel-import

## Objective

Let the owner upload the weekly Grido shift-close Excel; the API validates and normalizes it in memory and the web shows a preview of normalized shifts plus visible warnings. No ranking/podium yet (Sprint 3).

## Problem / Why

Every later sprint (analysis engine, dashboard, exports) needs trustworthy normalized shift data and a stable upload contract. Sprint 0 fixed the validation policy; this sprint implements it.

## Scope

- `POST /api/analysis` (multipart field `file`): created now with the import section of the response; Sprint 3 adds the three views (Almirante, Barranqueras, Both) to the same endpoint.
- Upload: multer memoryStorage, max 5 MB, single file, `.xlsx` only, ZIP signature (`PK\x03\x04`) check to reject renamed files. Nothing written to disk.
- Workbook read with exceljs from buffer; first worksheet; header row 1; headers matched trimmed + case-insensitive.
- Required columns: `succodigo`, `sucursal`, `turno`, `usulogin`, `turiniciaturno`, `turcierre`, `totaltiquets`, `sv_noactivada`, `sv_rechazada`, `sv_aceptada`, `desde`, `hasta`. All other columns ignored (money columns out of MVP scope).
- Total rejection (structured error): empty file, unreadable/corrupt, not `.xlsx`, too large, missing required columns (list them), more than one period (distinct `desde`/`hasta` across rows — user-approved exception 2026-11-02), no valid rows at all.
- Warnings (row handling, never silent):
  - invalid value (negative/non-integer count, invalid date, empty cashier, invalid branch/turno) → row excluded;
  - `sv_noactivada + sv_rechazada + sv_aceptada !== totaltiquets` → row excluded (user-approved 2026-11-02);
  - duplicate `turno` with identical data → counted once;
  - duplicate `turno` with differing data → all copies excluded.
- Normalization: cashier key = trimmed lowercase login; display name = first letter uppercased ("carlos" → "Carlos"); branch display name map `Barranquer` → `Barranqueras` (others as in file); `activadas = sv_rechazada + sv_aceptada`; datetimes are local wall-clock (Argentina) as written by the source system — never shift by timezone (exceljs returns Excel serials as UTC Dates; serialize wall-clock without `Z`).
- Response (import section): period `{ from, to }`, branches `{ code, name, shiftCount }[]`, normalized shifts, warnings `{ code, message, row?, turno? }[]`, summary `{ totalRows, includedRows, excludedRows }`.
- Web: upload zone (drag & drop + picker), states: idle, processing, success, success-with-warnings, error; preview table (branch, turno, cashier, start, tickets, activadas, aceptadas); warnings list; "Reemplazar archivo"; keep the selected `File` in state (exports re-send it later); health indicator becomes a small header detail. UI copy in neutral Spanish.
- Docs: API_CONTRACT, DATA_DICTIONARY (required columns), BACKEND_RULES (new), TESTING_STRATEGY (new), DECISIONS.

Out of scope: consolidation, effectiveness, ranking, podium, observations, dashboard cards, exports, persistence.

## Constraints

- Business/validation logic in `apps/api/src/import` as pure functions (no Express imports); `http/` only adapts.
- Shared zod schemas are the contract; web never recomputes business values.
- Test fixtures generated in tests with exceljs and fictitious names; the real Excel is never committed.
- Strict TS, existing lint/format rules. Test-first for import and endpoint behavior.
- Run `pnpm audit` after adding exceljs; stop and report if a high/critical advisory affects reading.

## Acceptance criteria

1. Real file → 28 shifts, 2 branches, period 2026-10-19..2026-10-25, 0 warnings.
2. `.xlsx` without `sv_aceptada` → rejected, message lists missing column.
3. 6 MB file, `.csv`, renamed `.txt` → rejected with clear Spanish messages in the UI.
4. Invalid row / duplicate turno → warning shown, rest processed.
5. No file written to disk.
6. `pnpm typecheck|lint|format:check|test|build` pass.

## Tasks

- [x] T1 `packages/shared`: new error codes, normalized shift, warning and import response schemas.
- [x] T2 `apps/api/src/import`: read workbook buffer → raw rows, header normalization, required columns.
- [x] T3 `apps/api/src/import`: row validation + normalization, duplicates, single-period check, warnings.
- [x] T4 `apps/api/src/http`: multer upload, limits, signature check, `POST /api/analysis`, error mapping.
- [x] T5 `apps/web/src/features/upload`: upload UI, states, preview table, warnings, replace file.
- [x] T6 Docs update.
- [x] T7 Review follow-up R3-wallclock-invalid-date-throws: out-of-range numeric date serials are rejected as invalid values instead of throwing.

## Routing

- T1–T6: delegated direct (one bounded writer). Trigger: writer trigger — 2+ non-trivial files per task.

## Delivery

- Strategy: ask-on-risk; user previously chose a single PR per sprint (Sprint 1). Forecast ~1.2–1.6k authored lines.
- Branch: `feat/sprint-2-excel-import` from `270cfd6` (main after PR #1 merge). Last reviewed boundary: `270cfd6`.

## Progress / Evidence

- Engram mirror `odd/sprint-2-excel-import/tasks`: PENDING (host session registration could not be confirmed, 2026-11-02); resync when available.

- T1 (delegated writer): RED `analysis.test.ts` failed (`Cannot find module './analysis.js'`); GREEN shared 19/19 passed, typecheck/lint/format clean. Commit `d5525b6`.
- T2 (delegated writer): exceljs 4.4.0 added; `pnpm audit --prod` = 2 moderate (uuid <11.1.1 buffer arg, minimatch via archiver/unzipper glob), no high/critical, none on the read path. RED `read-workbook.test.ts` failed (`Cannot find module './errors.js'`); first GREEN run 12/13 (ZIP without workbook reported EMPTY_FILE → fixed: no worksheet = UNREADABLE_FILE); GREEN api 30/30. Added ZIP central-directory guard (declared uncompressed size ≤ 64 MB) before exceljs inflates. Commit `3f8d6fc`.
- T3 (delegated writer): RED `normalize-shifts.test.ts` + `import-shift-workbook.test.ts` failed (`Cannot find module`); first GREEN run 33/36 (three fixtures had start after the default close; the close-before-start rule excluded them correctly → fixtures fixed); GREEN api 53/53. Manual check on the real file (not committed): 28 shifts, branches 1/2 with 14 each, period 2026-10-19..2026-10-25, 0 warnings, summary 28/28/0. Commit `90ce97a`.
- T4 (delegated writer): multer 2.5.0 + @types/multer 2.3.0 added; audit unchanged (2 moderate). RED `analysis-router.test.ts` 17/18 failed (only GET 404 passed); GREEN api 71/71 on first implementation run. Memory storage only; multer/busboy errors mapped to 400/413/415. Commit `8a569a4`.
- T5 (delegated writer): RED `api.test.ts` (`uploadAnalysis is not a function`, 2 failed) and `features/upload/*.test.ts(x)` (`Failed to resolve import`); GREEN web 21/21. Added shadcn `table`, `--warning` token; health indicator moved to the header (compact). Commit `4193e93`.
- T6 (delegated writer): docs updated (API_CONTRACT, DATA_DICTIONARY, BUSINESS_RULES, ARCHITECTURE, DECISIONS D-18..D-26, README, DEVELOPMENT_WORKFLOW) and added BACKEND_RULES, TESTING_STRATEGY. Passive docs: structural check only (prettier). Commit: `docs: document excel import` (hash in git log).
- Final verification (2026-11-02): install ok; typecheck/lint/format:check/build pass; tests shared 19, api 71, web 21 (all pass); audit --prod 2 moderate (uuid, minimatch; transitive via exceljs, not on the read path).
- Live check (`PORT=3002 pnpm start`; port 3001 was held by a pre-existing server process not started in this session): real file → 28 shifts, 2 branches, period 2026-10-19..2026-10-25, 0 warnings; renamed .txt→.xlsx 415, .txt 415, .csv 415, no file 400, 6 MB 413 — all with Spanish messages. Acceptance criteria 1–6 met (5: multer memoryStorage, no disk writes).

- Parent spot check: fresh server on :3002 with the real file → 28 shifts, Almirante 14 / Barranqueras 14, period 2026-10-19..2026-10-25, 0 warnings, summary 28/28/0.
- Native review (2026-11-02): assessed medium (`configuration_change` apps/api/package.json), review_due slice_budget_reached (4403 lines over 270cfd6..HEAD). Consent granted. Lens review-reliability: approved, acknowledged, authority burned (lineage review-69e24456b984851b).
- Advisory follow-ups (non-blocking): R3-wallclock-invalid-date-throws (WARNING, `apps/api/src/import/cell-values.ts:53-57`: out-of-range numeric date serial yields Invalid Date not caught); R3-period-check-ignores-row-validity (`normalize-shifts.ts:62-68`); R3-http-mapping-untested (`analysis-router.ts:9-17`: FILE_TOO_LARGE from ZIP guard and TOO_MANY_ROWS lack supertest coverage).

- T7 (inline, one mechanical fix + unit tests): actual impact was worse than reported — `toISOString()` threw `RangeError: Invalid time value`, so the whole upload would fail with 500. RED: `vitest run src/import/cell-values.test.ts` → 1 failed (RangeError). GREEN: api 76/76; `pnpm typecheck|lint|format:check|test|build` ok. E2E: 2-row fictitious file with `turiniciaturno = 1e15` → HTTP 200, 1 included, 1 excluded with INVALID_VALUE warning (row 3).

## Next step

- Owner review of the branch; push and PR are the owner's decisions. Resync the Engram mirror (still PENDING from the writer's side).
