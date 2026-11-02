# Project overview

Grido Analytics turns the weekly shift-close Excel of a Grido ice-cream franchise into an upselling
(SB, _sobreventa_) effectiveness report per cashier: ranking, podium, observations, and PDF/Excel
exports. It runs on Vercel (see [DEPLOYMENT.md](DEPLOYMENT.md)) or on the owner's own computer
(`pnpm start`), with no database and no login.

## Who it is for

| Person          | Need                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------- |
| Franchise owner | Upload the weekly file, see who sells upsells best per branch, and share a printable result. |

The owner is a non-technical Spanish speaker (Argentina), so the UI is in Spanish.

## Branches

| Branch       | Code (`sucursal`) | Name in the Excel (`succodigo`) |
| ------------ | ----------------- | ------------------------------- |
| Almirante    | 1                 | Almirante                       |
| Barranqueras | 2                 | Barranquer                      |

## MVP boundaries

- In: upload one weekly `.xlsx`, in-memory processing, three views (Almirante, Barranqueras, both
  branches), ranking, podium, warnings, PDF and Excel export.
- Out: database, history, authentication, money analysis, multi-user access.
- Future: PostgreSQL + Prisma for weekly history.

## Roadmap

| Sprint | Outcome                                                        |
| ------ | -------------------------------------------------------------- |
| 0      | Business rules and architecture approved                       |
| 1      | Foundations: monorepo, API + web talking, tooling, docs (this) |
| 2      | Excel import and validation with warnings                      |
| 3      | Analysis engine (effectiveness, ranking, podium)               |
| 4      | Dashboard                                                      |
| 5      | PDF and Excel exports                                          |
| 6      | Delivery to the owner's computer                               |

See [REQUIREMENTS.md](REQUIREMENTS.md) and [BUSINESS_RULES.md](BUSINESS_RULES.md).
