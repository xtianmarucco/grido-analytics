# Architecture

Two production topologies, same code and same origin (no CORS): **local** (one Node process on
`127.0.0.1:3001`, Express serves `/api` and the built React app) and **Vercel** (CDN serves the
web build, Express runs as one Vercel Function for `/api/*`; see [Deployment](#deployment-vercel)).

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

| Folder      | Contents                                                                              | Exists since |
| ----------- | ------------------------------------------------------------------------------------- | ------------ |
| `http/`     | `createApp`, routers, error envelope, static web serving                              | Sprint 1     |
| `config.ts` | Env parsing (`HOST`, `PORT`, `NODE_ENV`)                                              | Sprint 1     |
| `server.ts` | Composition root: config, web build detection, `listen`                               | Sprint 1     |
| `index.ts`  | Vercel Function entry: default export of `createApp()`, no `listen`, no static files  | Sprint 7     |
| `import/`   | Excel reading (exceljs), row validation and normalization → shifts + warnings. Pure.  | Sprint 2     |
| `analysis/` | Pure business functions: views, totals, ranking, podium, observations. No Express.    | Sprint 3     |
| `export/`   | Pure report builders: PDF doc definition (pdfmake) and workbook (exceljs) of one view | Sprint 5     |

Folders are created when their sprint starts, not before.

Rule: `http/` adapts requests to `import/` → `analysis/` → `export/`. `import/` and `analysis/`
never import from `http/` or Express; only `import/read-workbook.ts` touches exceljs. Import rules:
[BACKEND_RULES.md](BACKEND_RULES.md).

## `apps/web/src`

| Folder               | Contents                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `features/health/`   | Header server indicator (container `ServerStatus` + view)                                    |
| `features/upload/`   | Drop zone, upload mutation (keeps the selected `File`), `ImportPreview`, `WarningList`       |
| `features/analysis/` | Dashboard (Sprint 4): view selector, summary, podium, observations, ranking, chart, imported |
| `features/export/`   | Report downloads (Sprint 5): `ReportDownloads` container (mutation) + view                   |
| `components/ui/`     | shadcn/ui primitives used (button, card, alert, badge, table)                                |
| `lib/api.ts`         | Typed fetch client; validates responses with shared schemas                                  |
| `lib/format.ts`      | `es-AR` formatting (percent, integer, date, period, ordinal); `lib/plural.ts` for counts     |

Containers own data fetching (TanStack Query) and UI state; presentational components receive props
only.

### Dashboard flow (Sprint 4)

```text
UploadAnalysis (container: selected File + upload mutation)
├─ UploadAnalysisView        drop zone → processing → compact "Procesado" row / error
└─ AnalysisDashboard         (container, key = upload; state: selected view, disclosure)
   └─ AnalysisDashboardView  warnings alert · ViewSelector + period · ReportDownloads (S5) ·
                             SummaryCards · Podium · ObservationList · RankingTable ·
                             EffectivenessChart · ImportedData
```

- Default view `all` ("Ambas sucursales"), falling back to the first view; switching views is a
  state change, never a request. A new upload remounts the dashboard.
- The web never recomputes positions, eligibility, podium steps or observations. It only formats,
  filters/sorts rows for display (`useRankingDisplay`) and chooses chart axis bounds
  (`chartScale.ts`).
- A view without cashiers shows the summary, the observations and a muted note instead of podium,
  ranking and chart.
- Recharts (bundled) draws the effectiveness chart; the SVG is `aria-hidden` and a visually hidden
  table carries the values. Design rules: [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md),
  [FRONTEND_RULES.md](FRONTEND_RULES.md).

## Production mode

`server.ts` serves the web build when `apps/web/dist/index.html` exists (override the folder with
`WEB_DIST_DIR`). `pnpm start` always builds first, so it always serves the web app. Reason in
[DECISIONS.md](DECISIONS.md) (D-6).

## Deployment (Vercel)

```text
Browser ──► <project>.vercel.app ──┬─ static file (apps/api/public = copied web build) → CDN
                                   ├─ /api/*  → Vercel Function apps/api/src/index.ts → createApp()
                                   └─ other   → /index.html (vercel.json rewrite)
```

Vercel project Root Directory `apps/api`, Express preset, region `gru1`. `pnpm run vercel-build`
builds `@grido/shared` and `@grido/web` and copies the web build into `apps/api/public`. The
function is stateless like the local server: each request carries the Excel; nothing is stored.
Settings, limits and the first-deploy checklist: [DEPLOYMENT.md](DEPLOYMENT.md) (D-47, D-48).

## Request lifecycle

`POST /api/analysis` (multipart `file`) → multer memory storage → `import/` → `analysis/` (`analyzeImport`) → JSON `{ import, views }`. The backend is the single source of truth. Each request carries the Excel file; nothing is stored
between requests. Exports re-send the file plus the selected view and are recomputed server-side.
