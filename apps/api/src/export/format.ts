/**
 * es-AR report formatting, same rules as the web (docs/UI_UX_GUIDELINES.md §5). It only presents
 * analysis values, never changes them. Calendar dates are sliced, never parsed (D-18).
 */

const integerFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const NOT_CALCULABLE = 'No calculable';

/** `18.8679…` → `18,87 %`; `null` → `No calculable`. */
export function formatPercent(value: number | null): string {
  return value === null ? NOT_CALCULABLE : `${decimalFormat.format(value)} %`;
}

/** `1234` → `1.234`. */
export function formatInteger(value: number): string {
  return integerFormat.format(value);
}

/** `2026-10-19` → `19/10/2026`. */
export function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/** `19/10/2026 – 25/10/2026`. */
export function formatPeriod(period: { from: string; to: string }): string {
  return `${formatDate(period.from)} – ${formatDate(period.to)}`;
}

/** `1` → `1.º`. */
export function formatOrdinal(position: number): string {
  return `${position}.º`;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Generation time as `dd/mm/yyyy HH:mm` in the server's local timezone. */
export function formatGeneratedAt(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `[1, 2]` → `Almirante, Barranqueras`; unknown codes fall back to `Sucursal <code>`. */
export function formatBranches(
  codes: readonly number[],
  names: Readonly<Record<number, string>>,
): string {
  return codes.map((code) => names[code] ?? `Sucursal ${code}`).join(', ');
}
