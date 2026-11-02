# Testing strategy

Vitest everywhere (`pnpm test`). Test-first for behavior: failing test, implementation, refactor.

## Layers

| Layer            | Where                        | How                                                          |
| ---------------- | ---------------------------- | ------------------------------------------------------------ |
| Contract         | `packages/shared/src/*.test` | Parse valid and invalid bodies with the zod schemas          |
| Import rules     | `apps/api/src/import/*.test` | Pure functions on plain `RawRow` objects; no Express, no I/O |
| Workbook reading | `apps/api/src/import/*.test` | Real exceljs on in-memory workbooks built in the test        |
| HTTP             | `apps/api/src/http/*.test`   | supertest against `createApp()`; no listening socket         |
| Web              | `apps/web/src/**/*.test.tsx` | Testing Library + jsdom; stub `fetch`, never modules         |

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

Report only counts and the period, never names.
