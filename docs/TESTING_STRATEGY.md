# Testing strategy

Vitest everywhere (`pnpm test`). Test-first for behavior: failing test, implementation, refactor.

## Layers

| Layer            | Where                          | How                                                                         |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------- |
| Contract         | `packages/shared/src/*.test`   | Parse valid and invalid bodies with the zod schemas                         |
| Import rules     | `apps/api/src/import/*.test`   | Pure functions on plain `RawRow` objects; no Express, no I/O                |
| Analysis rules   | `apps/api/src/analysis/*.test` | Pure functions on built shifts / totals (`analysis/test-utils/builders.ts`) |
| Workbook reading | `apps/api/src/import/*.test`   | Real exceljs on in-memory workbooks built in the test                       |
| HTTP             | `apps/api/src/http/*.test`     | supertest against `createApp()`; no listening socket                        |
| Web              | `apps/web/src/**/*.test.tsx`   | Testing Library + jsdom; stub `fetch`, never modules                        |

## Web components

- Presentational analysis components are tested with fixture props typed from `@grido/shared`
  (`features/analysis/fixtures.ts`, fictitious names); the upload flow with a stubbed `fetch`.
- Query by role and accessible name. The ranking renders both a table (md+) and phone cards in
  the DOM (CSS decides which is visible), so scope queries with `within(table)` / `within(list)`.
- One test per state: combined view by default, view switch, view without cashiers, warnings
  alert opening "Datos importados", each podium status (filled, tie, covered-by-tie, vacant),
  eligible and ineligible rows, empty search, display-only sort, "No calculable".
- Recharts measures 0×0 in jsdom: the chart is tested through its accessible table and its
  caption, and the axis bounds through the pure `chartScale.ts`. Layout (no horizontal scroll at
  375 px) is checked manually in a browser.

## Excel fixtures

- Built in memory with `apps/api/src/import/test-utils/workbook.ts` (`buildWorkbook`,
  `shiftRow`, `buildZip`). No binary fixtures are committed.
- Names are fictitious (`Ana`, `Bruno`, `Carla`). Real files contain employee names: never
  commit them, never copy their names into tests, docs or commit messages. `*.xlsx` is
  gitignored outside `fixtures/`.
- Dates: `excelDate('2026-10-19T08:00:00')` builds the `Date` exceljs uses for Excel serials
  (UTC fields = wall-clock time).

## Manual check with a real file

Acceptance for the real weekly file is checked by hand, outside the repo:

```bash
pnpm start
curl -s -F "file=@/path/to/report.xlsx" http://127.0.0.1:3001/api/analysis
```

Report only counts, the period, effectiveness values, podium statuses and observation rule ids per view, never names.

For the dashboard, also open the page, upload the file and check the three views at 375 px and
1280 px wide (`document.documentElement.scrollWidth <= innerWidth`). Screenshots stay outside the
repo because they show real names.
