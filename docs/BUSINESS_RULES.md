# Business rules

Approved in Sprint 0. Implemented in Sprint 3 (`apps/api/src/analysis`).

## Definitions

| Term          | Definition                                                  |
| ------------- | ----------------------------------------------------------- |
| Tickets       | `totaltiquets` = number of sales                            |
| Activadas     | `sv_rechazada + sv_aceptada` (upsell offered)               |
| Aceptadas     | `sv_aceptada` (upsell accepted)                             |
| Invariant     | `totaltiquets = sv_noactivada + sv_rechazada + sv_aceptada` |
| Effectiveness | `aceptadas / activadas × 100`                               |

## Effectiveness

1. Sum counts over the whole week first; never average percentages.
2. Round only for display.
3. No activadas → "No calculable": ranked last and not podium-eligible.
4. The Excel percentage columns (`porcsv*`) are truncated integers and are ignored.

## Views and identity

- Three views: Almirante, Barranqueras, both branches.
- Cashier identity is case-insensitive (`carlos` = `Carlos`).
- The combined view merges a cashier's shifts across both branches before computing.

## Ranking

Order by, in sequence:

1. Effectiveness, descending.
2. Aceptadas, descending.
3. Activadas, descending.

Still tied → shared position.

## Podium

- Top 3 eligible cashiers per view.
- Eligible: ≥ 30 tickets **and** ≥ 1 aceptada in the view's period.
- Ineligible cashiers stay in the ranking with a visible reason.
- Vacant steps are shown empty.
- Tied cashiers share a step; the podium is never enlarged.

## Validation

| Situation                         | Result                  |
| --------------------------------- | ----------------------- |
| File unreadable                   | Whole file rejected     |
| Required column missing           | Whole file rejected     |
| Invalid row                       | Row excluded + warning  |
| Duplicate `turno`, identical rows | Counted once + warning  |
| Duplicate `turno`, differing data | Both excluded + warning |

Rows are never dropped silently.

## Scope

- Period: one week (`desde` / `hasta`).
- Money columns are ignored in the MVP.
