# Feature: sprint-6-cash-control — Sprint 6 — Cash control and sales indicators with alerts

## Context

After Sprint 5 (merged as PR #5), the owner asked to add to the summary: % cash sales (`turefectivo / venta`), % Club Grido (`porcclubgrido`) and cash-count difference (`turdiferencia`). The real goal is **control**: spot incongruences or signals that staff may be selling without ticketing, flag large differences per cashier/shift, and add improvement indicators from the same Excel. This reverses Sprint 0 decision "money columns ignored in MVP" (record as new DECISIONS entry). The planned "quality & delivery" sprint moves to Sprint 7. Sprint 5 review follow-ups (download revoke timing, stale export state across views) remain separate pending work.

## Approved decisions (user, 2026-11-02)

- Scope: all four — % efectivo + signal; cash difference + alert; % Club Grido; ticket promedio and tickets/hour.
- Cash-difference alert (per shift): `|turdiferencia| ≥ 1 %` of that shift's `turefectivo` (faltante or sobrante). If `turefectivo = 0` and difference ≠ 0 → alert. Real week flags 3 shifts (−6.000 / 3,81 %; +1.600 / 1,46 %; −1.530 / 1,00 % — boundary inclusive).
- Low-cash signal: cashier's cash share in a branch + slot is **≥ 10 percentage points below their peers** (same branch, same slot, peers = other cashiers' totals in that slot), **no minimum shifts**. Slot: `día` if `turiniciaturno` hour < 15, else `noche`. No peers in slot → no signal. Real week flags 1 (Almirante día, −12,5 pts, 1 shift).

## Calculation rules (consistent with Sprint 0: sum first, never average percentages)

- % efectivo = Σturefectivo / Σventa × 100; `null` ("No calculable") if Σventa = 0.
- % Club Grido = Σventaclubgrido / Σventa × 100 — equals `porcclubgrido` weighted by sales (per-shift value matches the column; verified on 28 rows). Always shown as %, never pesos.
- Diferencia de caja: net Σturdiferencia, faltante Σ(negatives), sobrante Σ(positives), count of shifts with difference ≠ 0, count of alerted shifts.
- Ticket promedio = Σventa / Σtickets (`null` if 0 tickets).
- Tickets por hora = Σtickets / Σ(turcierre − turiniciaturno in hours), per cashier per slot (shown with slot).
- Combined view: cashier indicators merged across branches; **signals always computed within branch + slot** (never mixing branches), listed in the combined view as the union.
- Exact comparisons on integer cents where thresholds apply (avoid float drift at the 1 % / 10-pt boundaries).

## Copy and tone

- Alerts/signals labelled "Señal para revisar", amber (warning token), never red; texts are facts + cautious interpretation, never causal or accusatory (e.g. "La diferencia de caja del turno fue −$6.000 (3,81 % del efectivo). Conviene revisar el arqueo de ese turno.").
- A visible note in the section: "Estos datos solo incluyen ventas tickeadas; las señales indican qué revisar, no prueban irregularidades."

## Implementation (tasks)

- T1 `packages/shared/src/analysis.ts` (+ `import.ts`): extend normalized shift with `venta`, `turefectivo`, `ventaClubGrido`, `turDiferencia` (decimal money values) and slot; add `cashControl` to the view (summary money indicators, per-cashier indicators, shift alerts, low-cash signals, slot stats). Additive.
- T2 `apps/api/src/import/read-workbook.ts` `REQUIRED_COLUMNS` += `venta`, `turefectivo`, `ventaclubgrido`, `turdiferencia`; `normalize-shifts.ts` + `cell-values.ts`: money parser (finite decimals; `venta`, `turefectivo`, `ventaclubgrido` ≥ 0; `turdiferencia` any sign; invalid → row excluded with existing `INVALID_VALUE` warning). Optional consistency warning only if cheap — not required.
- T3 `apps/api/src/analysis/cash-control.ts` (new, pure): indicators per view/cashier/slot, shift alerts (1 %), low-cash signals (10 pts vs slot peers). Wire into `analyze.ts` (`analyzeImport`) next to `summarizeView`/`consolidateCashiers` in `consolidate.ts`.
- T4 Web `apps/web/src/features/analysis/`: `SummaryCards.tsx` adds % efectivo, % Club Grido, Diferencia de caja (net, with faltante/sobrante), Ticket promedio; new `CashControl.tsx` section (per-cashier table → phone cards, like `RankingTable.tsx`; alerted shifts list; signals; limitation note) placed after the ranking; formatting via `lib/format.ts` (add money `es-AR` currency `$ 1.234,56`).
- T5 Exports: `export/xlsx/build-report-workbook.ts` adds sheet `Control de caja` (per-cashier indicators + alerted shifts) and summary rows; `export/pdf/build-report-doc-definition.ts` adds a "Control de caja" section; reuse `export/format.ts`.
- T6 Docs: BUSINESS_RULES (formulas, thresholds, slot rule), DATA_DICTIONARY (columns now used), API_CONTRACT, DECISIONS (reverses money-out-of-scope; thresholds), UI_UX_GUIDELINES (section + alert style), README.

Routing: one delegated writer, one commit per task, RED first, no new dependencies. Branch `feat/sprint-6-cash-control` from updated `main`. Keep commits small so native review fits the budget (split slices if needed).

## Verification

- Unit tests: each formula incl. `null` cases; alert boundary exactly 1 % (inclusive) and just below; `turefectivo = 0`; signal boundary exactly 10 pts and 9,99; no peers → no signal; combined view never mixes branches for signals; money parsing (decimals, negatives only for diferencia).
- Endpoint tests: missing new required column → 422 `MISSING_COLUMNS`; response additive.
- Real file (manual, numbers only in committed artifacts): % efectivo Almirante 39,44 / Barranqueras 40,42 / Ambas 40,05; % Club Almirante 63,09 / Barranqueras 54,78 / Ambas 57,88; net difference −1.680,17 / −7.250,64 / −8.930,81 (faltante −9.870,40 and sobrante +2.619,76 in Barranqueras); 3 shift alerts; 1 low-cash signal.
- Exports: new sheet/section present with the same numbers; `pnpm typecheck|lint|format:check|test|build`; screenshots at 375/1280 px (headless Chromium already on the machine) for the new section; user visual check.

## Tasks

- [x] T1 Shared contract (normalized shift money fields + slot; view `cashControl`).
- [x] T2 Import: required money columns, money parsing, validation.
- [x] T3 `analysis/cash-control.ts`: indicators, shift alerts, low-cash signals; wired into `analyzeImport`.
- [x] T4 Web: summary cards + `CashControl` section.
- [ ] T5 Exports: Excel sheet `Control de caja` + PDF section.
- [ ] T6 Docs.

## Delivery

- Single PR per sprint. Branch `feat/sprint-6-cash-control` from updated `main`. Review base: main tip at branch creation.

## Progress / Evidence

- Feature doc created from the approved plan (2026-11-02). Engram mirror `odd/sprint-6-cash-control/tasks`: PENDING (host session registration failing in this session).

- T1 (delegated writer): RED — `packages/shared` vitest: `analysis.test.ts` failed to load (`ShiftSlot` undefined) with the new contract tests. GREEN — 53/53 shared tests, `tsc --noEmit` OK. Field names use camelCase (`turEfectivo` for `turefectivo`). API/web typecheck is expected to fail until T2–T4 fill the new required fields. Commit `3bdc73b`.

- T2 (delegated writer): RED — 30 new import tests failed (`parseMoney`/`parseNonNegativeMoney` missing, no money fields or slot on shifts, money columns not required). GREEN — `src/import` + router suites: 88 passed; the 3 router 200-response tests stay red until T3 adds `cashControl` (response schema requires it). Money is rounded to cents at parse (`toPrecision(15)` guards binary artifacts); text amounts accepted only as plain dot decimals. Commit `dd505b9`.

- T3 (delegated writer): RED — `cash-control.test.ts` failed (`./cash-control.js` missing) and `analyze.test.ts` failed schema validation (no `cashControl`). GREEN — API 211/211 tests, API `tsc --noEmit` clean. Thresholds on integer cents; the 10-point signal uses exact BigInt cross-multiplication. Real file (numbers only) matches every expected value: % efectivo 39,44 / 40,42 / 40,05; % Club 63,09 / 54,78 / 57,88; net −1.680,17 / −7.250,64 / −8.930,81; alerts 1,00 / 1,46 / 3,81; 1 signal (branch 1, día, 12,52 pts). Commit `65e3411`.

- T4 (delegated writer): RED — 13 web tests failed (`formatMoney`/`formatSignedMoney`/`formatDecimal`/`formatDayMonth` missing, 6 instead of 10 summary cards, `./CashControl` missing; upload tests failed on the response schema until the fixture shift got money fields). GREEN — web 88/88, web `tsc --noEmit` clean. Money format: `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })` → `$ 1.234,56` / `-$ 6.000,00` (no-break space after `$`); differences use `signDisplay: 'exceptZero'` (`+$ 2.619,76`). Headless Chromium on the real file: 375 px and 1280 px `scrollWidth <= innerWidth`. Commit: see T5 entry.

## Next step

- Implement T5.
