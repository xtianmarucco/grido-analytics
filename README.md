# Grido Analytics

Local, offline app that turns the weekly Grido shift-close Excel into an upselling (SB)
effectiveness ranking per cashier, with podium and PDF/Excel exports. No database, no login.

> Sprint 4 status: upload the weekly Excel and see the dashboard per view. PDF/Excel exports
> arrive in Sprint 5.

## Quick start

Requirements: Node 26, pnpm 11.17 (`corepack enable`).

```bash
pnpm install
pnpm start        # builds and serves http://127.0.0.1:3001
```

Development: `pnpm dev`, then open `http://127.0.0.1:5173`.

## How to use

1. Open the app and choose (or drop) the weekly shift-close `.xlsx`. It is processed on this
   computer and never stored.
2. The dashboard opens on **Ambas sucursales**; switch to Almirante or Barranqueras with the
   **Vista** selector (no re-upload).
3. Read top to bottom: summary cards, podium, observations (Dato / Interpretación /
   Recomendación), ranking (search by cashier, sort columns for reading; the official position
   never changes) and the effectiveness chart.
4. Rows excluded from the file are listed under **Datos importados** (collapsed; a warning
   above the views links to it).
5. **Analizar otro archivo** replaces the whole result.

## Approved business rules (Sprint 0)

| Rule          | Summary                                                                                 |
| ------------- | --------------------------------------------------------------------------------------- |
| Effectiveness | `aceptadas / (rechazadas + aceptadas) × 100` on weekly sums; never average percentages  |
| No activadas  | "No calculable", ranked last, not podium-eligible                                       |
| Ranking       | Effectiveness ↓, then aceptadas ↓, then activadas ↓; ties share a position              |
| Podium        | Top 3 eligible (≥ 30 tickets and ≥ 1 aceptada); ties share a step; never enlarged       |
| Views         | Almirante, Barranqueras, both branches; cashier names case-insensitive                  |
| Validation    | Reject unreadable files, missing columns, mixed periods; invalid rows excluded + warned |

Full detail: [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md).

## Docs

| Doc                                                  | Read it for                         |
| ---------------------------------------------------- | ----------------------------------- |
| [PROJECT_OVERVIEW](docs/PROJECT_OVERVIEW.md)         | What and for whom; roadmap          |
| [REQUIREMENTS](docs/REQUIREMENTS.md)                 | Functional and non-functional needs |
| [ARCHITECTURE](docs/ARCHITECTURE.md)                 | Packages, folders, request flow     |
| [BUSINESS_RULES](docs/BUSINESS_RULES.md)             | How effectiveness and podium work   |
| [DATA_DICTIONARY](docs/DATA_DICTIONARY.md)           | Excel columns                       |
| [BACKEND_RULES](docs/BACKEND_RULES.md)               | Import validation and normalization |
| [API_CONTRACT](docs/API_CONTRACT.md)                 | Endpoints and error envelope        |
| [DECISIONS](docs/DECISIONS.md)                       | Why things are the way they are     |
| [DEVELOPMENT_WORKFLOW](docs/DEVELOPMENT_WORKFLOW.md) | Scripts, conventions, checks        |
| [TESTING_STRATEGY](docs/TESTING_STRATEGY.md)         | Test layers and Excel fixtures      |
