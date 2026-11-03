# UI/UX guidelines

Design guide for the Sprint 4 dashboard: upload → per-view results (summary, podium, ranking,
observations, chart). It must be approved before any screen is built. Code rules live in
[FRONTEND_RULES.md](FRONTEND_RULES.md).

> **Status:** approved by the user on 2026-11-02: proposed palette (no official brand hex was
> provided), default view "Ambas sucursales" (`all`), podium and observation texts as written.

## Quick path

1. The owner uploads the weekly Excel.
2. The page shows the selected view: summary cards → podium → observations → ranking → chart.
3. A segmented control switches Almirante / Barranqueras / Ambas sucursales without re-uploading.
4. The Sprint 2 import preview stays available in a collapsed "Datos importados" section.

## 1. Principles

| Principle                   | What it means on screen                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clarity for non-experts     | Plain Spanish labels, one idea per block, no jargon ("efectividad", not "conversion rate"). Every number has a label and a unit.                               |
| Recognition, not shaming    | Highlight the top results warmly (podium metals). Low results use neutral tones; red is reserved for a rejected file. No "worst" labels, no red rows.          |
| Data ≠ interpretation       | Observations always show **Dato** (fact, numbers), **Interpretación** (cautious reading) and **Recomendación** (suggested action) as visually distinct levels. |
| Backend is the truth        | Positions, eligibility, podium and observation texts come from the API. The web only formats.                                                                  |
| Informative, never an error | "No calculable" and ineligibility reasons are informative badges (muted/info tone), not error styling.                                                         |
| Offline and calm            | No external resources. Motion is minimal and respects reduced motion.                                                                                          |

## 2. Palette (approved 2026-11-02)

Inspired by Grido: deep blue primary, light/sky blue accent, warm podium metals. No official brand
hex was provided; if the owner supplies them later, swap the values and recheck contrast.

**Theme choice:** light theme only for the MVP. Tokens stay in `:root` so a dark theme can be
added later without touching components; it is not designed or built now.

Contrast = WCAG 2.x relative-luminance ratio, computed from the hex values. Targets: body text
≥ 4.5:1; large text (≥ 18.66 px bold / 24 px), icons and UI boundaries ≥ 3:1.

### Core tokens

| Token                  | Hex       | OKLCH                      | Usage                                       |
| ---------------------- | --------- | -------------------------- | ------------------------------------------- |
| `--background`         | `#F6F8FB` | `oklch(0.978 0.005 258.3)` | Page background                             |
| `--card`, `--popover`  | `#FFFFFF` | `oklch(1 0 0)`             | Cards, table, popovers                      |
| `--foreground`         | `#0F1B2D` | `oklch(0.221 0.039 258.3)` | Body text, figures (deep navy ink)          |
| `--primary`            | `#0B3D91` | `oklch(0.386 0.148 260.7)` | Primary button, selected view, links, title |
| `--primary-foreground` | `#FFFFFF` | `oklch(1 0 0)`             | Text on primary                             |
| `--secondary`          | `#E8EEF6` | `oklch(0.947 0.013 255.5)` | Segmented-control track, secondary buttons  |
| `--accent`             | `#E0F2FE` | `oklch(0.951 0.025 236.8)` | Sky-blue highlight: hover, summary icons bg |
| `--accent-foreground`  | `#0B3D91` | `oklch(0.386 0.148 260.7)` | Text/icons on accent                        |
| `--muted`              | `#EEF2F7` | `oklch(0.96 0.008 253.9)`  | Neutral badges, table header, empty states  |
| `--muted-foreground`   | `#4F5D72` | `oklch(0.475 0.038 258.4)` | Secondary text, captions, "No calculable"   |
| `--border`             | `#D5DDE8` | `oklch(0.895 0.017 256.3)` | Decorative dividers and card edges only     |
| `--input`              | `#7E8B9C` | `oklch(0.632 0.03 255.2)`  | Search field and control boundaries         |
| `--ring`               | `#0284C7` | `oklch(0.588 0.139 242)`   | Focus ring (sky blue)                       |
| `--success`            | `#15803D` | `oklch(0.527 0.137 150.1)` | Positive status text/icons (file processed) |
| `--success-soft`       | `#EFF8F2` | `oklch(0.971 0.012 157)`   | Success alert/badge background              |
| `--warning`            | `#B45309` | `oklch(0.555 0.146 49)`    | Import warnings (amber, not red)            |
| `--warning-soft`       | `#FEF6E7` | `oklch(0.975 0.022 83.3)`  | Warning alert background                    |
| `--info`               | `#0369A1` | `oklch(0.5 0.119 242.7)`   | Informative text/icons (eligibility, O6)    |
| `--info-soft`          | `#E6F3FA` | `oklch(0.957 0.017 230.9)` | Info badge/alert background                 |
| `--destructive`        | `#B42318` | `oklch(0.5 0.182 29.5)`    | Rejected file / network error only          |
| `--destructive-soft`   | `#FDECEA` | `oklch(0.956 0.019 25.6)`  | Error alert background                      |

### Podium and chart tokens

| Token                  | Hex       | OKLCH                      | Usage                          |
| ---------------------- | --------- | -------------------------- | ------------------------------ |
| `--podium-gold`        | `#F2C14E` | `oklch(0.834 0.141 85.4)`  | Step 1 fill                    |
| `--podium-gold-fg`     | `#3D2C00` | `oklch(0.305 0.062 85.6)`  | Text on gold                   |
| `--podium-gold-edge`   | `#A27A12` | `oklch(0.603 0.119 84.4)`  | Step 1 outline / medal icon    |
| `--podium-silver`      | `#D3DAE3` | `oklch(0.886 0.015 254.6)` | Step 2 fill (text: foreground) |
| `--podium-silver-edge` | `#7B8794` | `oklch(0.618 0.024 250.3)` | Step 2 outline / medal icon    |
| `--podium-bronze`      | `#E2A372` | `oklch(0.765 0.099 58.5)`  | Step 3 fill                    |
| `--podium-bronze-fg`   | `#3D1F05` | `oklch(0.275 0.06 57.4)`   | Text on bronze                 |
| `--podium-bronze-edge` | `#9A5B2A` | `oklch(0.534 0.104 55.8)`  | Step 3 outline / medal icon    |
| `--chart-1`            | `#1D5FBF` | `oklch(0.501 0.165 258.7)` | Effectiveness bars             |
| `--chart-track`        | `#E8EEF6` | `oklch(0.947 0.013 255.5)` | Bar track (0–100 % background) |

### Contrast checks

| Pair (text / background)                    | Ratio   | Requirement | Pass |
| ------------------------------------------- | ------- | ----------- | ---- |
| foreground / background                     | 16.25:1 | 4.5         | Yes  |
| foreground / card                           | 17.28:1 | 4.5         | Yes  |
| foreground / secondary                      | 14.81:1 | 4.5         | Yes  |
| foreground / accent                         | 15.06:1 | 4.5         | Yes  |
| muted-foreground / card                     | 6.69:1  | 4.5         | Yes  |
| muted-foreground / background               | 6.28:1  | 4.5         | Yes  |
| muted-foreground / muted                    | 5.95:1  | 4.5         | Yes  |
| muted-foreground / accent                   | 5.83:1  | 4.5         | Yes  |
| primary-foreground / primary                | 10.04:1 | 4.5         | Yes  |
| primary / card (links, selected text)       | 10.04:1 | 4.5         | Yes  |
| primary / background                        | 9.44:1  | 4.5         | Yes  |
| primary / secondary (selected segment text) | 8.61:1  | 4.5         | Yes  |
| accent-foreground / accent                  | 8.75:1  | 4.5         | Yes  |
| success / card                              | 5.02:1  | 4.5         | Yes  |
| success / success-soft                      | 4.63:1  | 4.5         | Yes  |
| warning / card                              | 5.02:1  | 4.5         | Yes  |
| warning / warning-soft                      | 4.67:1  | 4.5         | Yes  |
| info / card                                 | 5.93:1  | 4.5         | Yes  |
| info / info-soft                            | 5.25:1  | 4.5         | Yes  |
| destructive / card                          | 6.57:1  | 4.5         | Yes  |
| destructive / destructive-soft              | 5.75:1  | 4.5         | Yes  |
| podium-gold-fg / podium-gold                | 8.03:1  | 4.5         | Yes  |
| foreground / podium-silver                  | 12.27:1 | 4.5         | Yes  |
| podium-bronze-fg / podium-bronze            | 6.96:1  | 4.5         | Yes  |
| podium-gold-edge / card (outline, icon)     | 3.94:1  | 3 (UI)      | Yes  |
| podium-silver-edge / card                   | 3.66:1  | 3 (UI)      | Yes  |
| podium-bronze-edge / card                   | 5.38:1  | 3 (UI)      | Yes  |
| chart-1 / card (bar vs background)          | 6.10:1  | 3 (graphic) | Yes  |
| chart-1 / chart-track                       | 5.23:1  | 3 (graphic) | Yes  |
| input / card (field boundary)               | 3.47:1  | 3 (UI)      | Yes  |
| ring / card (focus indicator)               | 4.10:1  | 3 (UI)      | Yes  |
| ring / background                           | 3.85:1  | 3 (UI)      | Yes  |
| border / card                               | 1.37:1  | decorative  | n/a  |

Rules derived from the table:

- `--border` is decorative only; any boundary a user must perceive (search field, segmented
  control, file button) uses `--input` or a filled background.
- The light sky blue `#38BDF8` (2.14:1 on white) is **not** used for text or meaningful marks;
  sky blue appears only as `--accent` backgrounds and the `--ring` focus color.
- Text on metal fills uses its paired `-fg` token, never white.

## 3. Typography

Inter Variable, bundled through `@fontsource-variable/inter` (D-12). Fallback:
`ui-sans-serif, system-ui, sans-serif`. Every figure (cards, table, podium, chart labels) uses
tabular numerals (`tabular-nums`) so columns align.

| Role               | Size / line height | Weight | Tailwind                  |
| ------------------ | ------------------ | ------ | ------------------------- |
| App title          | 20 / 28 px         | 600    | `text-xl font-semibold`   |
| Section title (h2) | 18 / 28 px         | 600    | `text-lg font-semibold`   |
| Card title (h3)    | 14 / 20 px         | 500    | `text-sm font-medium`     |
| Card figure        | 30 / 36 px         | 600    | `text-3xl font-semibold`  |
| Podium name        | 16 / 24 px         | 600    | `text-base font-semibold` |
| Podium figure      | 24 / 32 px         | 700    | `text-2xl font-bold`      |
| Body / table       | 14 / 20 px         | 400    | `text-sm`                 |
| Caption / helper   | 12 / 16 px         | 400    | `text-xs`                 |

Minimum text size is 12 px; anything a user must read to decide (reasons, observations) is
14 px. Phone figures drop one step (card figure 24 px).

## 4. Spacing, radius, elevation, layout

| Item      | Rule                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| Spacing   | 4 px scale. Inside cards 16 px (`p-4`), 24 px on desktop (`md:p-6`). Sections 32 px.   |
| Radius    | Existing `--radius: 0.625rem` (10 px) for cards; controls `rounded-md`; badges full.   |
| Elevation | Flat: cards use `border` + `shadow-xs`. No stacked shadows; the podium uses fills.     |
| Container | `max-w-5xl` (1024 px) centered, 16 px side gutter (`px-4`).                            |
| Grid      | Summary: 2 columns on phone, 3 on tablet, 6 on desktop. Podium: 3 columns from tablet. |

| Breakpoint | Width     | Layout                                                                    |
| ---------- | --------- | ------------------------------------------------------------------------- |
| Phone      | 375 px ↑  | Designed first. Single column, cards 2-up, ranking as cards, podium stack |
| Tablet     | `md` 768  | Podium 3 columns, ranking as table, summary 3-up                          |
| Desktop    | `lg` 1024 | Summary 6-up, observations and chart full width                           |

**No horizontal page scroll** at any width ≥ 320 px. Long names wrap (`break-words`); the
ranking switches to cards below `md` instead of scrolling a wide table.

## 5. Number and text formatting

All formatting uses `es-AR` and lives in the web formatting helpers (see
[FRONTEND_RULES.md](FRONTEND_RULES.md)); it never changes values, only presents them.

| Value           | Rule                                                                                            | Example                     |
| --------------- | ----------------------------------------------------------------------------------------------- | --------------------------- |
| Effectiveness   | 2 decimals, `es-AR`, then `" %"` (space, as backend)                                            | `18,87 %`, `0,00 %`         |
| `null` effect.  | Text "No calculable" in `muted-foreground`, no `%`                                              | `No calculable`             |
| Counts          | Integer, thousands separator                                                                    | `1.234`, `12.345`           |
| Date            | `dd/mm/yyyy`, sliced from the string, no `new Date()`                                           | `19/10/2026`                |
| Period          | `from – to` with an en dash and spaces                                                          | `19/10/2026 – 25/10/2026`   |
| Position        | Ordinal number from the API                                                                     | `1.º`, or `1` in table      |
| Branch list     | Branch names joined by `, ` (combined view)                                                     | `Almirante, Barranqueras`   |
| Money           | `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })` (no-break space after `$`) | `$ 1.234,56`, `-$ 6.000,00` |
| Cash difference | Same, with `signDisplay: 'exceptZero'`                                                          | `+$ 2.619,76`, `$ 0,00`     |
| Short date      | `dd/mm`, sliced from the wall-clock string                                                      | `21/10`                     |

Figures do not wrap: cells and labels holding a number use `whitespace-nowrap`.

Eligibility reason labels (from the API `message`, shown as-is; codes for mapping icons only):

| Code             | Label                     |
| ---------------- | ------------------------- |
| `MIN_TICKETS`    | Menos de 30 tickets       |
| `NO_ACCEPTED`    | Sin sobreventas aceptadas |
| `NOT_CALCULABLE` | Efectividad no calculable |

Glossary used in labels: **Tickets**, **Sobreventas activadas**, **Sobreventas aceptadas**,
**Efectividad**, **Cajero/a** ("Cajeros" in headers), **Turnos**.

## 6. Page layout

Order inside a view: summary → podium → observations → ranking → cash control → chart →
"Datos importados".
Recognition (podium) comes before detail; observations sit near the podium because they
explain it.

### Desktop (≥ 1024 px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Grido Analytics                                      ● Conectado al servidor │
│ Análisis semanal de sobreventa por cajero                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [F] semana-43.xlsx  ✓ Procesado                     [⟳ Analizar otro archivo] │
│                                                                              │
│ Vista  ┌───────────┬──────────────┬──────────────────┐                       │
│        │ Almirante │ Barranqueras │ Ambas sucursales │   19/10/2026 – 25/10/2026│
│        └───────────┴──────────────┴──────────────────┘                       │
│ ┌────────┐┌────────┐┌──────────┐┌──────────┐┌────────────┐┌────────┐         │
│ │Período ││Tickets ││Activadas ││Aceptadas ││Efectividad ││Cajeros │         │
│ │19/10 – ││ 1.234  ││   812    ││    15    ││   1,85 %   ││   3    │         │
│ └────────┘└────────┘└──────────┘└──────────┘└────────────┘└────────┘         │
│ Podio                                                                        │
│ ┌──────────────┐┌──────────────┐┌──────────────┐                              │
│ │ 2.º  silver  ││ 1.º  gold    ││ 3.º  vacant  │                              │
│ └──────────────┘└──────────────┘└──────────────┘                              │
│ Observaciones (list)                                                         │
│ Ranking  [Buscar cajero…]                                                  │
│ ┌──────┬──────────┬─────────┬─────────┬──────────┬────────────┬─────────────┐ │
│ │Pos.  │Cajero    │Tickets  │Activadas│Aceptadas │Efectividad │Podio        │ │
│ └──────┴──────────┴─────────┴─────────┴──────────┴────────────┴─────────────┘ │
│ Efectividad por cajero (bar chart)                                           │
│ ▸ Datos importados (collapsed)                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phone (375 px)

```text
┌─────────────────────────────┐
│ Grido Analytics             │
│ ● Conectado al servidor     │
├─────────────────────────────┤
│ [F] semana-43.xlsx ✓         │
│ [⟳ Analizar otro archivo]   │
│ ┌─────────┬────────┬──────┐ │
│ │Almirante│Barranq.│Ambas │ │  ← full width, wraps to 2 lines if needed
│ └─────────┴────────┴──────┘ │
│ 19/10/2026 – 25/10/2026     │
│ ┌───────────┐┌───────────┐  │
│ │Tickets    ││Activadas  │  │
│ │ 1.234     ││ 812       │  │
│ └───────────┘└───────────┘  │
│ ┌───────────┐┌───────────┐  │
│ │Aceptadas  ││Efectividad│  │
│ └───────────┘└───────────┘  │
│ Podio (stacked 1, 2, 3)     │
│ Observaciones               │
│ Ranking (cards)             │
│ Efectividad por cajero      │
│ ▸ Datos importados          │
└─────────────────────────────┘
```

## 7. Components

### 7.1 Header and view selector

- Header keeps the existing title, subtitle and server status (Sprint 1).
- View selector: a **segmented control** built as a radio group (`role="radiogroup"`, arrow
  keys move selection), one option per API view in API order, labels from `view.label`
  (Almirante / Barranqueras / Ambas sucursales). Selected: `primary` fill + `primary-foreground`
  text; unselected: `secondary` track + `foreground` text; boundary uses `--input`.
- Visible label "Vista" (or `aria-label="Vista"`). Default selection: the combined view
  (`all`), because it is the owner's overview. _(Approved 2026-11-02.)_
- Changing the view never re-uploads; it only swaps the displayed `AnalysisView`. Focus stays
  on the control; an `aria-live="polite"` region announces "Mostrando Almirante".

### 7.2 Summary cards

Ten cards: Período, Tickets, Sobreventas activadas, Sobreventas aceptadas, Efectividad general,
Cajeros (with "N turnos" as caption), % efectivo, % Club Grido, Diferencia de caja (net, with
"Faltante … · Sobrante …" caption) and Ticket promedio (Sprint 6). Grid: 2 columns on phone,
3 at `md`, 5 at `lg`; money figures are one size smaller so two fit side by side at 375 px. Each card: small accent icon, label (`text-sm
muted-foreground`), figure (`text-3xl tabular-nums`). Efectividad general `null` → "No
calculable" in muted tone. No trend arrows or colors judging the value.

```text
┌──────────────────────┐
│ (◎) Efectividad      │
│      general         │
│  1,85 %              │
│  15 de 812 activadas │  ← caption, muted
└──────────────────────┘
```

### 7.3 Podium

Three steps from `view.podium` in order 1, 2, 3. Desktop/tablet: classic arrangement
2 – 1 – 3 with step 1 tallest; **DOM and reading order stay 1, 2, 3** (visual reorder with CSS
`order` only from `md`). Phone: vertical stack 1, 2, 3, full width.

| State                 | Visual                                                                                    | Text                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `filled`, one cashier | Metal fill, medal icon, "1.º puesto", name, effectiveness, "10 aceptadas de 53 activadas" | —                                                                                  |
| `filled`, tie (2+)    | Same fill; names listed (API order); badge "Empate"                                       | "Comparten el 2.º puesto con el mismo resultado."                                  |
| `covered-by-tie`      | Muted dashed outline, no metal fill, link icon                                            | "Sin 3.º puesto: el empate en el 2.º puesto ocupa este lugar."                     |
| `vacant`              | Muted dashed outline, no metal fill, info icon                                            | "Puesto vacante: no hay suficientes cajeros que cumplan los requisitos del podio." |

- Metals mark position together with the position text, never color alone.
- Vacant/covered steps are calm (muted), not warnings. A caption under the podium links the
  requirements: "Requisitos: al menos 30 tickets, una sobreventa aceptada y efectividad
  calculable."

```text
Desktop                                      Phone
         ┌────────────┐                ┌─────────────────────────────┐
         │ [M] 1.º    │                │ [M] 1.º puesto              │
┌────────┤ Carla      ├────────┐       │ Carla · 18,87 %             │
│ [M] 2.º│ 18,87 %    │ 3.º    │       ├─────────────────────────────┤
│ Ana    │ 10 de 53   │ ┄┄┄┄   │       │ [M] 2.º puesto · Ana 1,92 % │
│ 1,92 % │            │ Puesto │       ├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
│        │            │ vacante│       │ (i) 3.º puesto vacante: …   │
└────────┴────────────┴────────┘       └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
```

`[M]` = medal icon in the step's edge color; `(i)` = info icon; dashed = vacant or
covered-by-tie step.

### 7.4 Ranking table

- Columns: **Pos.** · **Cajero** (name; combined view adds branch names as caption) ·
  **Tickets** · **Activadas** · **Aceptadas** · **Efectividad** · **Podio** (eligibility).
  Figures right-aligned, `tabular-nums`.
- Eligible: small success-toned badge "Participa" with check icon. Ineligible: muted badge
  "No participa" plus every reason as text below (`text-xs muted-foreground`), each with its
  icon. Not error-styled.
- Ties: the same position number on each tied row (1, 2, 2, 4) and a caption "Empate".
- **Search** ("Buscar cajero…", `type="search"`) filters by name, case- and
  accent-insensitive, display only. No match: "Ningún cajero coincide con «texto»."
- **Sort** (display only): clicking a column header toggles ascending/descending with
  `aria-sort`. Default order is the API ranking. A note under the table:
  "El puesto oficial lo calcula el sistema; ordenar la tabla no cambia el ranking." Positions
  shown always come from `entry.position`.
- Phone (< 768 px): each cashier is a card:

```text
┌─────────────────────────────────┐
│ 2  Ana                  1,92 %  │
│ Tickets 120 · Activ. 52 · Acep. 1│
│ ○ No participa                  │
│   ⓘ Menos de 30 tickets         │
└─────────────────────────────────┘
```

Sorting on phone uses a "Ordenar por" select instead of headers.

### 7.5 Observations

A list of cards in API order. Each card:

```text
┌──────────────────────────────────────────────────────────────┐
│ (icon)  Carla · Mejor resultado                              │  ← rule title, 14 px medium
│ Dato            Carla concretó 10 de 53 sobreventas (18,87 %)│  ← foreground, strongest
│ Interpretación  Es el resultado más alto de la vista…        │  ← muted-foreground
│ ➜ Recomendación Compartir cómo ofrece la sobreventa…         │  ← accent background strip
└──────────────────────────────────────────────────────────────┘
```

- Labels "Dato", "Interpretación", "Recomendación" are always visible text (`<dl>` with
  `<dt>`/`<dd>`), so the hierarchy does not depend on color.
- Per-rule icon and tone (lucide), none red:

| Rule | Title (web)                     | Icon             | Tone              |
| ---- | ------------------------------- | ---------------- | ----------------- |
| O1   | Mejor resultado                 | `Trophy`         | gold edge on card |
| O2   | Muchas oportunidades            | `Target`         | info              |
| O3   | Diferencia entre resultados     | `ArrowLeftRight` | info              |
| O4   | Buen resultado con poco volumen | `Sparkles`       | success           |
| O5   | Sin sobreventas aceptadas       | `CircleDashed`   | neutral (muted)   |
| O6   | Podio incompleto                | `Info`           | neutral (muted)   |

- No observations: "No hay observaciones para esta vista."

### 7.5b Cash control (Sprint 6)

Section "Control de caja" right after the ranking:

- Limitation note (info icon, muted): "Estos datos solo incluyen ventas tickeadas; las señales
  indican qué revisar, no prueban irregularidades."
- Two lists side by side at `lg` (stacked below): "Diferencias de caja para revisar" (date
  `dd/mm` · slot · cashier, signed difference, % of cash, API message) and "Efectivo bajo frente
  al resto del horario" (slot · cashier, cashier vs rest %, points, a muted "Turnos: lun 19/10
  13:38 · …" line, API message). In the
  combined view each item starts with its branch. Empty list → "Sin señales esta semana".
- Each item: card with an amber left border (`--warning`) and a `warning` badge
  "Señal para revisar" with `TriangleAlert`. Never the destructive red; texts are shown as-is.
- "Indicadores por cajero": table at ≥ 768 px (Cajero, Ventas, % efectivo, % Club Grido,
  Diferencia de caja with "N turnos a revisar" in amber, Ticket promedio, Tickets por hora with
  the per-slot rates), cards on phone, same pattern as the ranking.

### 7.6 Effectiveness chart

One horizontal bar chart (T7, Recharts) of effectiveness per cashier, in ranking order.

- **When it helps:** shown when the view has ≥ 2 cashiers with calculable effectiveness;
  otherwise omitted with a short muted note.
- **Axis:** linear, **always from 0**; max = 100 % or the next round step above the highest
  value (e.g. 25 % when the max is 18,87 %), chosen from the data only for display. Never a
  truncated or logarithmic axis.
- **Low values vs outlier:** with values of 0–2 % next to ~19 %, small bars stay small and
  honest; every bar carries its **value label at the bar end** (`1,92 %`), and a 0 % bar shows
  a 2 px stub plus the label "0,00 %" so it is visibly present. "No calculable" cashiers are
  listed with the text "No calculable" and no bar.
- Bars `--chart-1` on `--chart-track`; names on the Y axis at 14 px; no legend (one series),
  no gridline clutter, no animation when reduced motion is requested.
- Accessibility: chart wrapped in `<figure>` with `<figcaption>` "Efectividad por cajero";
  the SVG is `aria-hidden`, and a visually hidden table (or the ranking itself, referenced by
  `aria-describedby`) carries the same values.

```text
Efectividad por cajero
Carla   ████████████████████████████████████████  18,87 %
Ana     ████                                        1,92 %
Luis    ▏                                           0,00 %
Marta   No calculable
        0 %          5 %         10 %        15 %        20 %
```

### 7.7 "Datos importados" (collapsible)

The Sprint 2 `ImportPreview` (import summary, branches, shifts, warnings) moves into a native
`<details>`/`<summary>` section, collapsed by default, titled "Datos importados" with a caption
"N turnos · M advertencias". If there are warnings, the summary line shows a warning-toned
count so they stay visible without opening.

### 7.8 Upload area

Keeps the Sprint 2 drop zone and native file input. After success it collapses to a compact
row: file name, success check, "Analizar otro archivo" (outline button). Re-upload replaces the
whole result.

## 8. UI states and copy

| State                 | What the user sees                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No file               | Drop zone: "Cargue el Excel de cierre de turnos (.xlsx, hasta 4 MB). El archivo se procesa al momento y no se guarda." Button "Seleccionar archivo".                                                                                                                                                                                                                                                              |
| File selected         | Immediately starts processing (no extra confirm step); file name shown.                                                                                                                                                                                                                                                                                                                                           |
| Processing            | Spinner + "Procesando semana-43.xlsx…" in `role="status"`; controls disabled; previous results hidden.                                                                                                                                                                                                                                                                                                            |
| Success               | Compact upload row with ✓, then the dashboard. Status: "N turnos procesados."                                                                                                                                                                                                                                                                                                                                     |
| Success with warnings | Same dashboard plus a warning-toned alert above the views: "Se procesó el archivo con N advertencias. Revíselas en «Datos importados»." (link opens it)                                                                                                                                                                                                                                                           |
| Error                 | Destructive alert "No se pudo procesar semana-43.xlsx" + API message as-is (D-26) + "Seleccionar otro archivo". Only state that uses red.                                                                                                                                                                                                                                                                         |
| View without cashiers | Summary with zeros; podium/ranking/chart replaced by a muted card: "No hay cajeros con turnos en esta vista."                                                                                                                                                                                                                                                                                                     |
| Generating report     | Under the view selector: outline buttons "Descargar PDF · {vista}" / "Descargar Excel · {vista}". While one runs, both buttons and the view selector are disabled; the active one shows a spinner + "Generando…" and a `role="status"` line. Success: the browser downloads the server-named file. Error: destructive alert "No se pudo generar el informe" + API message as-is; it clears when the view changes. |

## 9. Accessibility

- **Keyboard order:** header → upload row → view selector → summary → podium → observations →
  ranking search → table headers (sort) → chart → "Datos importados". No positive `tabindex`.
- **Focus visible:** 2 px `--ring` outline with 2 px offset on every interactive element
  (contrast 4.10:1 on card).
- **Live regions:** one `role="status" aria-live="polite"` for upload progress/result and view
  changes; errors use `role="alert"`.
- **Semantics:** one `h1`, an `h2` per section; ranking is a real `<table>` with `<th
scope="col">` and a `<caption>`; sortable headers are buttons inside `<th>` with `aria-sort`.
  Phone cards are a `<ul>` list.
- **Color is never the only signal:** podium metals carry position text and medal icons;
  eligibility has text badges; observation tones come with icons and labels.
- **Reduced motion:** `motion-reduce:` disables spinner rotation speed-ups, chart animation and
  transitions; spinner falls back to a static icon plus text.
- **Touch targets:** at least 44 × 44 px on phone (segmented options, buttons, sort select).
- **Language:** `<html lang="es-AR">`.

## 10. Icons

`lucide-react` is **already a dependency** of `apps/web` (and `components.json` declares
`iconLibrary: lucide`). Icons are bundled at build time (tree-shaken), so no external
resources. Use 16 px (`size-4`) inline and 20 px in cards; decorative icons get `aria-hidden`.
Proposed set: `FileSpreadsheet`, `Upload`, `RotateCcw`, `Loader2`, `Calendar`, `Receipt`,
`Zap`, `CheckCircle2`, `Percent`, `Users`, `Trophy`, `Medal`, `Info`, `Link2`, `Target`,
`ArrowLeftRight`, `Sparkles`, `CircleDashed`, `Search`, `ArrowUpDown`, `ChevronDown`. No new
icon dependency is needed for Phase B.

## Checklist for approval

- [x] Palette accepted, or brand hex values provided (contrast rechecked after the change).
- [x] Section order and default view accepted.
- [x] Podium state texts accepted.
- [x] Observation titles accepted.
