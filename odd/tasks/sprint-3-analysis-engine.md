# Feature: sprint-3-analysis-engine

## Objective

Extend `POST /api/analysis` so that, for each of the three views (Almirante, Barranqueras, Both branches), it returns summary totals, ranking, podium and deterministic observations — all computed in the backend and covered by tests.

## Problem / Why

Sprint 2 delivers normalized shifts. The owner's goal (recognize and share good upselling practices) needs the authoritative business rules applied once, in the backend, so Sprint 4 (dashboard) and Sprint 5 (exports) only present results.

## Scope

- Views: one per branch present in the import (ordered by branch code) plus a combined "Ambas sucursales" view. Each view: id, label, summary, ranking, podium, observations.
- Consolidation per view: group shifts by cashier key (trimmed lowercase login); sum shifts count, tickets, activadas, aceptadas. Combined view merges a cashier across branches.
- Effectiveness = aceptadas / activadas × 100 on consolidated totals, full precision in the response (rounding only for display). No activadas → `null` ("No calculable").
- Summary per view: total tickets, activadas, aceptadas, general effectiveness (on view totals, `null` if no activadas), cashier count, shift count, period.
- Ranking: all cashiers of the view. Order: effectiveness desc, then aceptadas desc, then activadas desc; still tied → shared position, standard competition numbering (1, 2, 2, 4). Not calculable cashiers ranked last (they share the last position among themselves when tied by the same keys; deterministic display order by display name, documented as display-only).
- Eligibility: ≥ 30 tickets AND ≥ 1 aceptada AND effectiveness calculable. Each ineligible cashier carries all applicable reasons: `MIN_TICKETS` ("Menos de 30 tickets"), `NO_ACCEPTED` ("Sin sobreventas aceptadas"), `NOT_CALCULABLE` ("Efectividad no calculable").
- Podium: eligible cashiers only, ranked with the same comparator; positions 1–3 with standard competition numbering among eligible cashiers; tied cashiers share a step; podium never exceeds the 3 places (two tied at 2nd → no 3rd; three tied at 1st → no 2nd/3rd); vacant steps represented explicitly.
- Observations (deterministic, Spanish text built in backend; each has `rule`, optional `cashierKey`, `fact`, `interpretation`, `recommendation`; never attribute causes):
  - O1 top result: each cashier at podium position 1.
  - O2 many opportunities, low conversion: activadas ≥ mean activadas of the view's cashiers AND effectiveness < view general effectiveness (both calculable).
  - O3 relevant gap: best − worst calculable effectiveness ≥ 10 percentage points (needs ≥ 2 calculable cashiers).
  - O4 notable with low volume: tickets < 30 AND effectiveness calculable AND ≥ view general effectiveness.
  - O5 no accepted: activadas > 0 AND aceptadas = 0.
  - O6 incomplete podium: at least one vacant step.
  - Stable order: by rule, then by ranking position / display name.
- Response: additive — `{ import, views }`; the Sprint 2 web keeps working.
- Docs: BUSINESS_RULES (ranking, podium, observations with thresholds), API_CONTRACT, DECISIONS.

Out of scope: dashboard UI, charts, exports, persistence, historical comparisons, AI.

## Constraints

- Pure functions in `apps/api/src/analysis` (no Express, no exceljs imports); `http/` only wires.
- Shared zod schemas are the contract; the web never recomputes business values.
- Number formatting in observation text: Spanish (comma decimal, 2 decimals, e.g. "18,87 %").
- Fictitious names in tests; no real cashier names in code, tests, docs or commits.
- Test-first for every rule. No new dependencies.

## Acceptance criteria

1. Real file → podium Almirante: 1st, 2nd, vacant 3rd; Barranqueras: 1st, 2nd, vacant 3rd; Both: 3 filled steps; consolidated numbers match the Sprint 0 table (verified by counts, not names, in committed artifacts).
2. Tests cover ties (incl. 1, 2, 2, 4), division by zero, both podium requirements, vacancies, podium tie overflow, and each observation rule (fires / does not fire).
3. Sprint 2 upload UI still works (web tests pass; response is additive).
4. `pnpm typecheck|lint|format:check|test|build` pass.

## Tasks

- [x] T1 `packages/shared`: view, summary, ranking entry, eligibility reason, podium, observation schemas; extend analysis response with `views`.
- [x] T2 `apps/api/src/analysis/consolidate.ts`: view filtering, consolidation, effectiveness, summary.
- [x] T3 `apps/api/src/analysis/ranking.ts`: comparator, shared positions, eligibility and reasons.
- [x] T4 `apps/api/src/analysis/podium.ts`: eligible top 3, vacancies, ties.
- [ ] T5 `apps/api/src/analysis/observations.ts`: rules O1–O6.
- [ ] T6 Wire analysis into `POST /api/analysis` (additive response) with endpoint tests.
- [ ] T7 Docs update.

## Routing

- T1–T7: delegated direct (one bounded writer). Trigger: writer trigger — 2+ non-trivial files.

## Delivery

- Strategy: single PR per sprint (user preference). Branch `feat/sprint-3-analysis-engine` stacked on `feat/sprint-2-excel-import` (`7890692`, PR #2 open); retarget to `main` after PR #2 merges. Last reviewed boundary: `4aa46d1` + T7 under budget → review base for this sprint: `7890692`.

## Progress / Evidence

- T1 (delegated writer, base `7890692`): RED `pnpm --filter @grido/shared test` → analysis.test.ts failed (`EligibilityReasonCode` undefined). GREEN → 26/26. `views` is required in the schema; the router returns `views: []` until T6 and web fixtures gained `views: []`. Podium steps carry `status: filled | covered-by-tie | vacant`; observation rules are `O1`–`O6`. Full suite: shared 26, api 76, web 21.
- T2 (prev `1fa67d7`): RED `vitest run src/analysis` → cannot find `./consolidate.js`. GREEN → 10/10 (effectiveness incl. division by zero, views by branch code + combined, cross-branch merge with `branchCodes`, totals-not-averages). Combined label: "Ambas sucursales" for exactly two branches, otherwise "Todas las sucursales".
- T3 (prev `ecf6eec`): RED → cannot find `./ranking.js`. GREEN → analysis 24/24 (1, 2, 2, 4; aceptadas/activadas tie-breaks; not calculable last and shared; es display order inside ties; each eligibility reason and all-reasons case). Effectiveness is compared by cross-multiplication of integer counts, so equal ratios never drift.
- T4 (prev `03a7548`): RED → cannot find `./podium.js`. GREEN → analysis 32/32 (top 3, ineligible skipped and renumbered, 30-ticket/1-aceptada boundary, all vacant, two tied at 2nd → 3rd `covered-by-tie`, three tied at 1st, ties at 3rd kept, two tied at 1st → 2nd covered + 3rd vacant). Podium cashier `position` is the podium one (among eligible).
- Engram mirror `odd/sprint-3-analysis-engine/tasks`: PENDING (host session registration failing in this session).

## Next step

- Implement T5.
