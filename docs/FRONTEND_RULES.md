# Frontend rules

Rules for `apps/web`. The web is presentation only: it uploads the file, holds the API result
and formats it. Design decisions (palette, layout, copy) live in
[UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md); backend rules in [BACKEND_RULES.md](BACKEND_RULES.md).

## Quick rules

| Rule                       | In short                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Never recompute            | Positions, eligibility, podium, effectiveness and observation texts come from the API. |
| Container / presentational | Containers own hooks and state; views receive props and render.                        |
| Format in one place        | `es-AR` number/date helpers in one module, tested.                                     |
| Spanish UI, English code   | User copy in neutral Spanish (D-7); identifiers, comments and docs in English.         |
| Offline                    | No CDN, no remote fonts/icons/images; everything bundled (NF-1).                       |
| Only used shadcn           | Add a shadcn primitive only when a component uses it (D-13).                           |
| Behavior-first tests       | RTL + Vitest, one test per UI state, test-first.                                       |

## Folder structure

```text
apps/web/src/
├── App.tsx                       # Shell: header + UploadAnalysis
├── components/ui/                # shadcn primitives actually used
├── lib/
│   ├── api.ts                    # Typed fetch client, validates with shared schemas
│   ├── format.ts                 # es-AR formatting helpers (moved from features/upload)
│   └── utils.ts                  # cn()
└── features/
    ├── health/                   # Server status (Sprint 1)
    ├── upload/                   # Upload container, drop zone, mutation, ImportPreview
    └── analysis/
        ├── AnalysisDashboard.tsx      # Container: selected view state
        ├── AnalysisDashboardView.tsx  # Presentational: composes the sections
        ├── ViewSelector.tsx
        ├── SummaryCards.tsx
        ├── Podium.tsx
        ├── RankingTable.tsx           # Table (md+) and card list (phone)
        ├── useRankingDisplay.ts       # Display-only search + sort
        ├── ObservationList.tsx
        ├── EffectivenessChart.tsx
        ├── ImportedData.tsx           # Collapsible wrapper around ImportPreview
        └── *.test.tsx                 # Next to the component
```

Files are created when their task starts. One component per file; small private
sub-components may stay in the same file.

## Data flow

```text
UploadAnalysis (container)
  └─ useAnalysisUpload()  → TanStack Query useMutation → POST /api/analysis
       result: AnalysisResponse (validated by analysisResponseSchema)
  └─ AnalysisDashboard (container)  state: selectedViewId
       └─ AnalysisDashboardView (props: view, views, importResult, onSelectView)
            └─ SummaryCards · Podium · ObservationList · RankingTable · EffectivenessChart · ImportedData
```

- The mutation result is the only source of analysis data. It is held in the mutation state
  (or container state) and replaced by the next upload; nothing is persisted (NF-4).
- The selected view is UI state (`selectedViewId`), reset to the default view on each new
  result.
- Presentational components take shared types (`AnalysisView`, `RankingEntry`, `PodiumStep`,
  `Observation`) as props and contain no fetching or global state.
- **Allowed in the web:** formatting, filtering by name and re-ordering rows for display,
  choosing chart axis bounds, pluralizing copy. **Not allowed:** computing effectiveness,
  positions, eligibility, podium steps, ties or observations, or reading the raw shifts to
  derive analysis numbers.
- Display sort never changes `entry.position`; the shown position is always the API value.

## Formatting helpers

- Location: `apps/web/src/lib/format.ts` (the Sprint 2 `features/upload/format.ts` moves there
  when analysis needs it), tested in `lib/format.test.ts`.
- Helpers: `formatPercent(value: number | null)` → `18,87 %` or `No calculable`;
  `formatInteger(n)` → `1.234`; `formatDate('2026-10-19')` → `19/10/2026`;
  `formatPeriod({ from, to })` → `19/10/2026 – 25/10/2026`; `formatWallClock`.
- One shared `Intl.NumberFormat('es-AR', …)` instance per format, created at module level.
- Dates are sliced from the API strings, never parsed with `new Date()` (D-18).
- Percent format matches the backend observation texts: two decimals and a regular space
  before `%`.

## Components and reuse

- Reuse shadcn primitives (`Card`, `Badge`, `Table`, `Alert`, `Button`) instead of new styled
  wrappers. Variants go through `class-variance-authority`, not ad-hoc class strings repeated
  across files.
- Colors only through theme tokens (`bg-primary`, `text-muted-foreground`, `bg-podium-gold`);
  no raw hex values in components.
- A component that renders the same thing in two layouts (ranking table and phone cards)
  shares one data shape and one formatter, not two copies of the logic.
- Icons from `lucide-react`, decorative ones `aria-hidden`.
- New shadcn primitives (e.g. `toggle-group`, `collapsible`) are added only when used; prefer
  native elements (`<details>`, radio inputs) when they meet the design.

## Testing

- Vitest + React Testing Library + `user-event`, jsdom. See
  [TESTING_STRATEGY.md](TESTING_STRATEGY.md).
- Test-first: write the failing behavior test, implement, refactor.
- Test behavior, not implementation: query by role and accessible name (`getByRole`,
  `getByText`), never by class names or internal state.
- One test per UI state: no file, processing, success, success with warnings, error, view
  without cashiers; per podium step status (filled, tie, covered-by-tie, vacant); eligible and
  ineligible ranking rows; "No calculable".
- Presentational components are tested with fixture props typed from `@grido/shared`;
  containers with a mocked `fetch` (as in Sprint 2).
- Formatting helpers have unit tests, including `null`, 0, thousands and tie positions.
- Fixtures use anonymized names only (NF-6, D-16).

## No external resources

- Fonts via `@fontsource-variable/inter`, icons via `lucide-react`, charts via Recharts: all
  bundled by Vite.
- No `<link>` or `<script>` to remote hosts, no remote images, no analytics.

## Copy and language

- All visible text in neutral professional Spanish (D-7, NF-7); API messages are shown as-is
  (D-26, D-32).
- Code, identifiers, comments, tests' `describe`/`it` titles and docs in English.
- Copy that depends on counts goes through `plural()`.

## Performance

- Data is small (~5 cashiers per view, ≤ 10 000 rows imported); no virtualization or
  memoization by default. Use `useMemo` only for the display sort/filter if profiling shows a
  need.
- Recharts is the only new dependency (T7); import only the used chart parts.
- Switching views is a state change only, never a new request.
