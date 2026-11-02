# Data dictionary

Source: the weekly shift-close Excel. One sheet, 33 columns, one row per shift.

**Used** = read by the MVP. Headers are matched trimmed and case-insensitively in row 1 of the
first worksheet; column order does not matter and extra columns are ignored.

## Required columns

A file missing any of these is rejected (`MISSING_COLUMNS`, listing them):

`succodigo`, `sucursal`, `turno`, `usulogin`, `turiniciaturno`, `turcierre`, `venta`,
`turefectivo`, `turdiferencia`, `ventaclubgrido`, `totaltiquets`, `sv_noactivada`,
`sv_rechazada`, `sv_aceptada`, `desde`, `hasta`.

| Column                                                         | Accepted values                                 |
| -------------------------------------------------------------- | ----------------------------------------------- |
| `succodigo`, `usulogin`                                        | Non-empty text (numbers are read as text)       |
| `sucursal`, `turno`                                            | Integer > 0 (numeric text accepted)             |
| `totaltiquets`, `sv_noactivada`, `sv_rechazada`, `sv_aceptada` | Integer ≥ 0 (numeric text accepted)             |
| `turiniciaturno`, `turcierre`, `desde`, `hasta`                | Excel date-time (or a plain date serial number) |
| `venta`, `turefectivo`, `ventaclubgrido`                       | Decimal ≥ 0 (plain `1234.56` text accepted)     |
| `turdiferencia`                                                | Decimal, any sign                               |

Money is rounded to cents when read; grouped or currency text (`$ 1.234,56`) is invalid. An
invalid value excludes the row with an `INVALID_VALUE` warning.

Formula cells use their cached result; rich text and hyperlinks use their text; error cells
(`#N/A`, …) count as empty.

## Identity and period

| Column                      | Meaning                                                           | Used |
| --------------------------- | ----------------------------------------------------------------- | ---- |
| `succodigo`                 | Branch name (`Almirante`, `Barranquer`)                           | Yes  |
| `sucursal`                  | Branch code (1 Almirante, 2 Barranqueras)                         | Yes  |
| `sucdescrip`                | Always `TODAS`                                                    | No   |
| `turno`                     | Shift id, unique per branch (duplicate detection with `sucursal`) | Yes  |
| `caja`                      | Register                                                          | No   |
| `usulogin`                  | Cashier login                                                     | Yes  |
| `turusulogininic`           | Login that opened the shift                                       | No   |
| `turiniciaturno`            | Shift start datetime                                              | Yes  |
| `turcierre`                 | Shift close datetime                                              | Yes  |
| `turapertura`               | Equals the previous shift's close                                 | No   |
| `desde` / `hasta`           | Report period                                                     | Yes  |
| `desdeturno` / `hastaturno` | Always empty                                                      | No   |

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

## Money (cash control, Sprint 6)

| Column                                                                | Meaning                                                         | Used |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | ---- |
| `venta`                                                               | Ticketed sales (sum of the payment columns)                     | Yes  |
| `turefectivo`                                                         | Cash sales                                                      | Yes  |
| `turtarjeta`, `turtickets`, `turctacte`, `turmercadopago`, `turotros` | Other payment methods                                           | No   |
| `turdiferencia`                                                       | Cash-count difference (`totalcaja − cajateorica`; − = faltante) | Yes  |
| `turtotalcaja`, `turcajateorica`                                      | Cash count                                                      | No   |
| `ventaclubgrido`                                                      | Club Grido sales                                                | Yes  |
| `porcclubgrido`                                                       | Club Grido % of the shift (= `ventaclubgrido / venta`)          | No   |

Real files contain employee names. Never commit them; tests use anonymized fixtures.
