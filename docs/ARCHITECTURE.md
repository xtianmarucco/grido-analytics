# Architecture

One Node process in production: Express serves the API under `/api` and the built React app for
everything else, on `127.0.0.1:3001`. Same origin everywhere, so there is no CORS.

```text
Browser ──► 127.0.0.1:3001 ──► Express ──┬─ /api/*  → routers → analysis (pure functions)
                                         └─ other  → apps/web/dist (SPA fallback to index.html)

Dev:  Browser ──► 127.0.0.1:5173 (Vite) ──/api proxy──► 127.0.0.1:3001 (tsx watch)
```

## Workspace

| Package           | Role                                                          |
| ----------------- | ------------------------------------------------------------- |
| `apps/api`        | Express 5 API. Owns all business logic.                       |
| `apps/web`        | Vite + React 19 + Tailwind v4 + shadcn/ui. Presentation only. |
| `packages/shared` | Zod schemas and API contract types. No backend-only logic.    |

## `apps/api/src`

| Folder      | Contents                                                                             | Exists since |
| ----------- | ------------------------------------------------------------------------------------ | ------------ |
| `http/`     | `createApp`, routers, error envelope, static web serving                             | Sprint 1     |
| `config.ts` | Env parsing (`HOST`, `PORT`, `NODE_ENV`)                                             | Sprint 1     |
| `server.ts` | Composition root: config, web build detection, `listen`                              | Sprint 1     |
| `import/`   | Excel reading (exceljs), row validation and normalization → shifts + warnings. Pure. | Sprint 2     |
| `analysis/` | Pure business functions: views, totals, ranking, podium, observations. No Express.   | Sprint 3     |
| `export/`   | PDF (pdfmake) and Excel (exceljs) generation                                         | Sprint 5     |

Folders are created when their sprint starts, not before.

Rule: `http/` adapts requests to `import/` → `analysis/` → `export/`. `import/` and `analysis/`
never import from `http/` or Express; only `import/read-workbook.ts` touches exceljs. Import rules:
[BACKEND_RULES.md](BACKEND_RULES.md).

## `apps/web/src`

| Folder               | Contents                                                      |
| -------------------- | ------------------------------------------------------------- |
| `features/health/`   | Header server indicator (container `ServerStatus` + view)     |
| `features/upload/`   | Drop zone, upload mutation, import preview and warnings       |
| `features/analysis/` | Views, ranking, podium, warnings (Sprint 4)                   |
| `components/ui/`     | shadcn/ui primitives used (button, card, alert, badge, table) |
| `lib/api.ts`         | Typed fetch client; validates responses with shared schemas   |

Containers own data fetching (TanStack Query); presentational components receive props only.

## Production mode

`server.ts` serves the web build when `apps/web/dist/index.html` exists (override the folder with
`WEB_DIST_DIR`). `pnpm start` always builds first, so it always serves the web app. Reason in
[DECISIONS.md](DECISIONS.md) (D-6).

## Request lifecycle

`POST /api/analysis` (multipart `file`) → multer memory storage → `import/` → `analysis/` (`analyzeImport`) → JSON `{ import, views }`. The backend is the single source of truth. Each request carries the Excel file; nothing is stored
between requests. Exports re-send the file plus the selected view and are recomputed server-side.
