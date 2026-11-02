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

- [x] T1 Monorepo root: workspace, base tsconfig, ESLint, Prettier, `.gitignore`, `.env.example`, root scripts.
- [ ] T2 `packages/shared`: error envelope + health zod schemas and types, with unit tests.
- [ ] T3 `apps/api`: Express app on 127.0.0.1, `/api/health`, API 404, error handler; supertest tests (RED first).
- [ ] T4 `apps/web`: Vite + React + Tailwind v4 + shadcn/ui + @fontsource + TanStack Query health status with connected/error states.
- [ ] T5 Production mode: Express serves `apps/web/dist` with SPA fallback; `pnpm start` builds and runs one process.
- [ ] T6 Docs: `/docs` set listed in scope + README with Sprint 0 approved rules.

## Routing

- T1–T6: delegated direct (one bounded writer). Trigger: writer trigger — 2+ non-trivial files per task.

## Delivery

- Strategy: ask-on-risk (default). Forecast: ~900–1300 authored lines (configs + docs), above the ~400 budget; chain strategy to be asked before PR planning.
- Branch: `feat/sprint-1-foundations` from `4e0de7f` (empty initial commit on `main`).

## Progress / Evidence

- Engram mirror `odd/sprint-1-foundations/tasks`: PENDING (host session registration could not be confirmed on 2026-11-02); resync when available.
- T1 (delegated writer): root workspace, tsconfig.base, ESLint 10 flat config, Prettier, .gitignore, .env.example, .nvmrc, root scripts. Checks: `pnpm install` ok, `pnpm lint` ok, `pnpm format:check` ok; typecheck/test have no projects yet. TypeScript pinned to ~6.0.3 because typescript-eslint 8.72 requires <6.1. No RED applicable (config only).

## Next step

- Implement T2.
