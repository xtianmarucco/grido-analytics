# Data dictionary

Source: the weekly shift-close Excel. One sheet, 33 columns, one row per shift.

**Used** = read by the MVP. Required columns are defined in Sprint 2.

## Identity and period

| Column                      | Meaning                                          | Used |
| --------------------------- | ------------------------------------------------ | ---- |
| `succodigo`                 | Branch name (`Almirante`, `Barranquer`)          | Yes  |
| `sucursal`                  | Branch code (1 Almirante, 2 Barranqueras)        | Yes  |
| `sucdescrip`                | Always `TODAS`                                   | No   |
| `turno`                     | Shift id, unique per shift (duplicate detection) | Yes  |
| `caja`                      | Register                                         | No   |
| `usulogin`                  | Cashier login                                    | Yes  |
| `turusulogininic`           | Login that opened the shift                      | Yes  |
| `turiniciaturno`            | Shift start datetime                             | Yes  |
| `turcierre`                 | Shift close datetime                             | Yes  |
| `turapertura`               | Equals the previous shift's close                | No   |
| `desde` / `hasta`           | Report period                                    | Yes  |
| `desdeturno` / `hastaturno` | Always empty                                     | No   |

## Upselling (SB)

| Column                | Meaning                      | Used |
| --------------------- | ---------------------------- | ---- |
| `totaltiquets`        | Tickets (sales count)        | Yes  |
| `sv_noactivada`       | Sales with no upsell offered | Yes  |
| `sv_rechazada`        | Upsell offered and rejected  | Yes  |
| `sv_aceptada`         | Upsell offered and accepted  | Yes  |
| `porcsvactivada`      | System %, truncated integer  | No   |
| `porcsvaceptada`      | System %, truncated integer  | No   |
| `porcsvaceptadatotal` | System %, truncated integer  | No   |

## Money (ignored in the MVP)

| Column                                                                               | Meaning                                            |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `venta`                                                                              | Sum of the payment columns                         |
| `turefectivo`, `turtarjeta`, `turtickets`, `turctacte`, `turmercadopago`, `turotros` | Payment methods                                    |
| `turtotalcaja`, `turcajateorica`, `turdiferencia`                                    | Cash count; `diferencia = totalcaja − cajateorica` |
| `ventaclubgrido`, `porcclubgrido`                                                    | Club Grido sales                                   |

Real files contain employee names. Never commit them; tests use anonymized fixtures.
