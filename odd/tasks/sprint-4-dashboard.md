# Feature: sprint-4-dashboard

## Objective

After uploading the Excel, the owner sees, per view (each branch and "Ambas sucursales"), the summary cards, podium, ranking and observations, on desktop and phone, following a documented design guide approved before any screen is built.

## Problem / Why

Sprint 3 returns authoritative analysis views but the UI only shows the import preview. The owner needs a clear, non-technical, accessible dashboard to recognize good results and act on observations.

## Scope

- Phase A (T1): `docs/UI_UX_GUIDELINES.md` and `docs/FRONTEND_RULES.md` — palette inspired by Grido with AA contrast (to be confirmed by the user), typography (local Inter), spacing, components, number formatting (`18,87 %`, "No calculable"), podium design (filled / covered-by-tie / vacant), UI states, responsive behavior (375 px, no horizontal scroll), accessibility, container/presentational rules. **Stop for user approval after T1.**
- Phase B (T2–T9), only after the guide is approved:
  - T2 theme tokens in Tailwind, header, view selector (Almirante / Barranqueras / Ambas sucursales).
  - T3 summary cards: period, tickets, activadas, aceptadas, general effectiveness, cashiers.
  - T4 podium: vacant and shared steps, reason when vacant.
  - T5 ranking table: search by cashier, eligibility reasons, display-only column sort (official position always from backend), phone card layout.
  - T6 observations: Dato / Interpretación / Recomendación.
  - T7 one horizontal bar chart of effectiveness per cashier (Recharts, the only new dependency).
  - T8 flow: upload → results; Sprint 2 preview moves to a collapsible "Datos importados" section; "Analizar otro archivo".
  - T9 docs.

Out of scope: exports (Sprint 5), persistence, historical comparisons, recomputing business values in the browser.

## Constraints

- The web never recomputes business values; it only formats and presents API data.
- No external resources at runtime (fonts/icons bundled).
- Spanish UI copy (neutral, professional); code and docs in English.
- Container/presentational split; reusable components; shadcn/ui only for components actually used.
- Test-first for component behavior (RTL + Vitest).

## Acceptance criteria

1. Real file shows the three views with the Sprint 0 podiums.
2. At 375 px wide: no horizontal scroll, everything readable.
3. Keyboard operable; AA contrast.
4. Clear states: no file, processing, error, warnings, view without cashiers.
5. No external resources loaded.
6. `pnpm typecheck|lint|format:check|test|build` pass.

## Tasks

- [x] T1 Design guide: `docs/UI_UX_GUIDELINES.md`, `docs/FRONTEND_RULES.md` (stop for approval).
- [x] T2 Theme tokens, header, view selector.
- [x] T3 Summary cards.
- [ ] T4 Podium.
- [ ] T5 Ranking table.
- [ ] T6 Observations.
- [ ] T7 Effectiveness chart.
- [ ] T8 Upload → results flow, collapsible import preview.
- [ ] T9 Docs.

## Routing

- T1: delegated direct (writer trigger: 2 non-trivial docs + reading existing UI to prepare them).
- T2–T9: delegated direct (one bounded writer), after approval.

## Delivery

- Single PR per sprint (user preference). Branch `feat/sprint-4-dashboard` from `7a83e80` (main after PR #3). Review base: `7a83e80`.

## Progress / Evidence

- T1: added `docs/UI_UX_GUIDELINES.md` (palette with hex/OKLCH and computed WCAG ratios, typography, layout, formatting, component specs with wireframes, states, accessibility, icons) and `docs/FRONTEND_RULES.md`; D-34 in `docs/DECISIONS.md`. Checks: `prettier --check` on the four files and `pnpm format:check` pass. Commit: see `git log` (`docs: add ui/ux guidelines and frontend rules`). Palette pending user confirmation of brand colors.
- 2026-11-02: user APPROVED the design guide as written — proposed palette (no official brand hex
  provided), default view "Ambas sucursales" (`all`), podium and observation texts. Recorded in D-34
  and the guide status.
- T2 (previous commit `b20d568`): theme tokens (guide hex values) in `index.css`, focus ring per §9,
  badge variants (success/info/muted/warning soft), `lib/format.ts` (moved from `features/upload`,
  adds `formatPercent`, `formatInteger`, `formatPeriod`, `formatOrdinal`), `ViewSelector` (native
  radio group, API labels and order), `AnalysisDashboard` container (default `all`, falls back to the
  first view) with period and an `aria-live` "Mostrando …" announcement; `<html lang="es-AR">`. The
  page header keeps title, subtitle and server status; the period sits next to the view selector
  (guide wireframe). RED: 5 failing tests + 2 missing modules; GREEN: 31/31 web tests.
- T3 (previous commit `4ca022d`): `SummaryCards` — six cards (Período, Tickets, Sobreventas activadas, Sobreventas aceptadas, Efectividad general with "N aceptadas de M activadas", Cajeros with "N turnos"), 2/3/6-column grid, muted "No calculable"; `plural` moved to `lib/` and formats counts with `es-AR` grouping. RED: missing module; GREEN: 35/35 web tests.
- Engram mirror `odd/sprint-4-dashboard/tasks`: PENDING (host session registration failing in this session).

## Next step

- T4 podium.
