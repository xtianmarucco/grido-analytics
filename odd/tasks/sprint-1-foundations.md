# Feature: sprint-1-foundations

## Objective

Create the Grido Analytics base monorepo: a local, offline-capable app where an Express API and a React web app communicate, with quality tooling and initial documentation. No Excel or analysis logic yet.

## Problem / Why

The project starts empty. Sprints 2–6 (Excel import, analysis engine, dashboard, exports, delivery) need a consistent workspace, a runnable API and web app, a single-command local start, and documented business rules approved in Sprint 0.

## Scope

- pnpm workspaces: `apps/api`, `apps/web`, `packages/shared`; strict TypeScript everywhere.
- `packages/shared`: zod schemas for the error envelope `{ error: { code, message, details } }` and the health response.
- `apps/api`: Express 5 bound to `127.0.0.1:3001`, `GET /api/health`, API 404 and error handler (500 never leaks internals); supertest tests.
- `apps/web`: Vite + React + Tailwind CSS v4 + shadcn/ui, local fonts via @fontsource, TanStack Query call to `/api/health` with connected/error states.
- Dev: `pnpm dev` runs both; Vite proxies `/api` to `:3001`. Prod: `pnpm start` builds and Express serves `apps/web/dist` from one origin.
- Scripts: `dev`, `start`, `build`, `test`, `lint`, `typecheck`, `format:check`. ESLint, Prettier, Vitest.
- Docs: PROJECT_OVERVIEW, REQUIREMENTS, ARCHITECTURE, BUSINESS_RULES, DATA_DICTIONARY, API_CONTRACT, DECISIONS, DEVELOPMENT_WORKFLOW, README.

Out of scope: multer, exceljs, pdfmake, Excel parsing, analysis rules, dashboard, exports, React Router, React Hook Form, database, auth.

## Constraints

- No external network resources at runtime (no CDN fonts/scripts/CSS).
- No CORS needed: same origin in dev (proxy) and prod (static serving).
- Business logic will live only in `apps/api/src/analysis` (pure functions, no Express imports).
- Generated technical artifacts in English. Conventional commits, no AI attribution.
- Test-first where a runnable deterministic test applies (api health/404/500).

## Acceptance criteria

1. `pnpm install && pnpm dev` starts both services; the UI shows "Connected to server".
2. With the API down, the UI shows a clear error, not a blank screen.
3. `pnpm start` serves one URL (`http://127.0.0.1:3001`) that works offline.
4. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
5. Server is not reachable from other machines (binds 127.0.0.1).
6. No external resources loaded.

## Tasks

- [x] T1 Monorepo root: workspace, base tsconfig, ESLint, Prettier, `.gitignore`, `.env.example`, root scripts. (commit c761a46)
- [x] T2 `packages/shared`: error envelope + health zod schemas and types, with unit tests. (commit a5ab8c8)
- [x] T3 `apps/api`: Express app on 127.0.0.1, `/api/health`, API 404, error handler; supertest tests (RED first). (commit 79baf12)
- [x] T4 `apps/web`: Vite + React + Tailwind v4 + shadcn/ui + @fontsource + TanStack Query health status with connected/error states. (commit 91f32c8)
- [x] T5 Production mode: Express serves `apps/web/dist` with SPA fallback; `pnpm start` builds and runs one process. (commit 211e7b2)
- [x] T6 Docs: `/docs` set listed in scope + README with Sprint 0 approved rules. (commit ffe1025)

## Routing

- T1–T6: delegated direct (one bounded writer). Trigger: writer trigger — 2+ non-trivial files per task.

## Delivery

- Strategy: ask-on-risk (default). Forecast: ~900–1300 authored lines (configs + docs), above the ~400 budget; chain strategy to be asked before PR planning.
- Branch: `feat/sprint-1-foundations` from `4e0de7f` (empty initial commit on `main`).

## Progress / Evidence

- Engram mirror `odd/sprint-1-foundations/tasks`: PENDING (host session registration could not be confirmed on 2026-11-02); resync when available.
- T1 (delegated writer): root workspace, tsconfig.base, ESLint 10 flat config, Prettier, .gitignore, .env.example, .nvmrc, root scripts. Checks: `pnpm install` ok, `pnpm lint` ok, `pnpm format:check` ok; typecheck/test have no projects yet. TypeScript pinned to ~6.0.3 because typescript-eslint 8.72 requires <6.1. No RED applicable (config only).
- T2 (delegated writer): `@grido/shared` with `errorResponseSchema` (+ `ErrorCode`) and `healthResponseSchema`. RED: `pnpm --filter @grido/shared test` failed (2 files, modules missing). GREEN: 7/7 tests pass; `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, shared `build` ok. Commit hash recorded in the next task commit.
- T3 (delegated writer): `@grido/api` with `parseConfig` (HOST default 127.0.0.1, PORT default 3001), `createApp`, `/api/health`, `notFoundHandler`, `createErrorHandler` + `HttpError`, `server.ts`. RED: `pnpm --filter @grido/api test` failed (modules missing). GREEN: 9/9 tests (health 200 + schema, no x-powered-by, 404 NOT_FOUND, sync/async 500 INTERNAL_ERROR without leaking message/stack, HttpError mapping, config defaults/invalid port). typecheck, lint, format:check, build ok; compiled server smoke: health JSON and 404 envelope on 127.0.0.1.
- T4 (delegated writer): `@grido/web` with Vite 8, React 19, Tailwind v4, shadcn/ui (manual setup, `components.json`; button, card, alert, badge), `@fontsource-variable/inter`, TanStack Query `useHealth` + container/presentational `ServerStatus`, `lib/api.ts` (`fetchHealth`, `ApiError`). UI copy in Spanish (see DECISIONS). Tests: 8/8 (api client: ok, network failure, non-JSON 502, envelope, invalid body; ServerStatus: connected, error + retry button, recovery after retry). typecheck, lint, format:check, build ok. Dev smoke: `pnpm dev` → `GET http://127.0.0.1:5173/api/health` proxied to Express. pnpm 11 auto-added `minimumReleaseAgeExclude` entries for `globals` and `@tanstack/*` (releases newer than the release-age policy).
- T5 (delegated writer): `createStaticWebRouter` (hashed `/assets` cached 1y immutable, missing asset → JSON 404, SPA fallback for HTML GET/HEAD outside `/api`, `index.html` no-cache); `/api/*` 404 mounted before static. Production mode = `apps/web/dist/index.html` exists (override `WEB_DIST_DIR`), chosen over `NODE_ENV` so `pnpm start` works on Windows without env tooling. RED: 3 failing static tests; GREEN: api 15/15. Smoke via `pnpm start`: health JSON, `/api/nope` 404, `/` and `/foo/bar` contain "Grido Analytics".
- T6 (delegated writer): `docs/` PROJECT_OVERVIEW, REQUIREMENTS, ARCHITECTURE, BUSINESS_RULES, DATA_DICTIONARY, API_CONTRACT, DECISIONS (D-1..D-17, incl. Spanish UI copy D-7 and web-dist detection D-6), DEVELOPMENT_WORKFLOW, plus README with Sprint 0 rules. Structural check: `pnpm format:check` ok. Passive docs, no RED. Commit hash recorded in the final docs(odd) commit.
- Final verification (2026-11-02): `pnpm install` exit 0; `pnpm typecheck` exit 0; `pnpm lint` exit 0; `pnpm format:check` exit 0; `pnpm test` exit 0 (shared 7, api 15, web 8); `pnpm build` exit 0; `pnpm start` → `/api/health` 200 JSON ok, `/api/nope` 404, `/` contains "Grido Analytics" (1 match), listening on 127.0.0.1:3001 only; CDN grep over `apps/web/dist` + `index.html`: no matches.

- Native review (2026-11-02): assessed medium (`configuration_change` .env.example), `review_due: slice_budget_reached` over 4e0de7f..6357b0b. Consent granted. Lens: review-reliability. Outcome: approved, acknowledged, authority burned (lineage review-893fdce0403195e8). Reviewed boundary advances to 6357b0b.
- Parent spot check: `pnpm test` → shared 7/7, api 15/15, web 8/8 passed.
- Advisory follow-ups (non-blocking): R3-empty-web-dist-dir (WARNING, `apps/api/src/server.ts:12`: empty `WEB_DIST_DIR` resolves to cwd); R3-composition-root-untested (`server.ts:11-17`); R3-spa-fallback-edges-untested (`static-web.ts:30-41`); R3-non-json-4xx-as-network (`apps/web/src/lib/api.ts:39-49`).
- Open: pnpm 11 added `minimumReleaseAgeExclude` entries (globals, @tanstack/*) in `pnpm-workspace.yaml`; user decision pending.

## Next step

- Decide on advisory follow-up T7 (WARNING fix), release-age exclusions, and PR chain strategy (~1.5k authored lines > ~400).
