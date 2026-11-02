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

- One view per branch in the file, ordered by branch code (`branch-<code>`, labelled with the
  import's branch name), then the combined view (`all`): "Ambas sucursales" with two branches,
  "Todas las sucursales" otherwise.
- Cashier identity is case-insensitive (`carlos` = `Carlos`); the display name is the import's
  `cashierName`.
- The combined view merges a cashier's shifts across both branches before computing; the
  entry lists the branches (`branchCodes`).
- Summary per view: tickets, activadas, aceptadas, cashier and shift counts, period, and the
  general effectiveness on the view totals (`null` without activadas).

## Ranking

Every cashier of the view. Order by, in sequence:

1. Effectiveness, descending. Not calculable goes after any calculable value (even 0 %).
2. Aceptadas, descending.
3. Activadas, descending.

Still tied → shared position, standard competition numbering (1, 2, 2, 4). Inside a tie the
display order is by display name (Spanish collation): display only, it never changes positions.
Effectiveness is compared exactly (cross-multiplied integer counts), so equal ratios always tie.

## Podium

- Eligible: ≥ 30 tickets **and** ≥ 1 aceptada **and** calculable effectiveness, in the view.
- Ineligible cashiers stay in the ranking with every applicable reason:

  | Code             | Message                   |
  | ---------------- | ------------------------- |
  | `MIN_TICKETS`    | Menos de 30 tickets       |
  | `NO_ACCEPTED`    | Sin sobreventas aceptadas |
  | `NOT_CALCULABLE` | Efectividad no calculable |

- Eligible cashiers are renumbered among themselves with the ranking comparator; steps 1–3
  hold the cashiers at exactly that position. Tied cashiers share a step; the podium is never
  enlarged.
- Step status:

  | Status           | When                                                    |
  | ---------------- | ------------------------------------------------------- |
  | `filled`         | At least one eligible cashier holds the position        |
  | `covered-by-tie` | A tie above uses it up (two tied at 2nd → no 3rd)       |
  | `vacant`         | Not enough eligible cashiers (shown empty; triggers O6) |

## Observations

Deterministic, built in the backend in neutral Spanish. Each one has a fact (numbers), a
cautious interpretation and a recommendation; texts never attribute causes. Percentages use
`es-AR` with two decimals (`18,87 %`); counts are integers.

| Rule | Fires when                                                                              | Per     |
| ---- | --------------------------------------------------------------------------------------- | ------- |
| O1   | Cashier on podium step 1 (every tied cashier)                                           | Cashier |
| O2   | Aceptadas ≥ 1 **and** activadas ≥ view mean per cashier **and** effectiveness < general | Cashier |
| O3   | Best − worst calculable effectiveness ≥ 10 points (≥ 2 calculable cashiers)             | View    |
| O4   | Tickets < 30 **and** calculable effectiveness ≥ general                                 | Cashier |
| O5   | Activadas > 0 **and** aceptadas = 0                                                     | Cashier |
| O6   | At least one podium step `vacant` (`covered-by-tie` does not count)                     | View    |

Order: by rule, then ranking order. O2 and O5 never fire for the same cashier: cashiers with
zero aceptadas get only O5 (user decision 2026-11-02). O2 also applies to podium cashiers,
because a podium place among few eligible cashiers does not imply good effectiveness. Thresholds
are compared exactly on integer counts.

## Cash control (Sprint 6)

Implemented in `apps/api/src/analysis/cash-control.ts`. Same rule as effectiveness: sum first,
never average percentages; round only for display. Money is read rounded to cents.

| Indicator          | Formula                                                              | Base zero → |
| ------------------ | -------------------------------------------------------------------- | ----------- |
| % efectivo         | Σ`turefectivo` / Σ`venta` × 100                                      | `null`      |
| % Club Grido       | Σ`ventaclubgrido` / Σ`venta` × 100 (always a %, never $)             | `null`      |
| Diferencia de caja | net Σ`turdiferencia`; faltante = Σ negatives; sobrante = Σ positives | —           |
| Ticket promedio    | Σ`venta` / Σ`totaltiquets`                                           | `null`      |
| Tickets por hora   | Σ`totaltiquets` / Σ(`turcierre` − `turiniciaturno`) in hours         | `null`      |

- **Slot**: `dia` when the wall-clock hour of `turiniciaturno` is < 15, else `noche` (labels
  "Día" / "Noche"; no timezone conversion). Tickets per hour is also given per cashier per slot.
- **Shift alert** ("Señal para revisar"): `|turdiferencia| ≥ 1 %` of that shift's
  `turefectivo`, faltante or sobrante, inclusive. Compared on integer cents:
  `|dif| × 100 ≥ efectivo`. `turefectivo = 0` with a non-zero difference → alert (no %).
- **Low-cash signal** ("Señal para revisar"): in one branch + slot, the cashier's % efectivo is
  ≥ 10 points below the peers' (the other cashiers' totals in that branch + slot), inclusive,
  no minimum shifts. Compared exactly by cross-multiplication on cents
  (`10 × (Ep·Vc − Ec·Vp) ≥ Vp·Vc`). No peers, or Σ`venta` = 0 on either side → no signal.
- **Combined view**: cashier indicators merge branches; signals are always computed within
  branch + slot (never across branches) and listed as the union, each with its branch.
- Texts are neutral facts plus a cautious recommendation, never causal or accusatory. The
  section always shows: "Estos datos solo incluyen ventas tickeadas; las señales indican qué
  revisar, no prueban irregularidades."

## Validation

Implemented in Sprint 2 (`apps/api/src/import`); full detail in
[BACKEND_RULES.md](BACKEND_RULES.md).

| Situation                                | Result                 |
| ---------------------------------------- | ---------------------- |
| File unreadable, empty or not `.xlsx`    | Whole file rejected    |
| Required column missing                  | Whole file rejected    |
| More than one period (`desde` / `hasta`) | Whole file rejected    |
| No valid row left                        | Whole file rejected    |
| Invalid row                              | Row excluded + warning |
| Counts do not add up to `totaltiquets`   | Row excluded + warning |
| Duplicate `turno`, identical rows        | Counted once + warning |
| Duplicate `turno`, differing data        | All excluded + warning |

Rows with content are never dropped silently.

## Scope

- Period: one week (`desde` / `hasta`).
- Money columns `venta`, `turefectivo`, `ventaclubgrido` and `turdiferencia` feed cash control
  (Sprint 6, D-41); the other payment and cash-count columns are still ignored.
