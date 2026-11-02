/**
 * es-AR display formatting. It only presents API values, never changes them. Dates are sliced
 * from the API strings, never parsed with `new Date()`, so the browser's timezone can never
 * shift them (D-18).
 */

const integerFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `2026-10-19T13:38:00` → `19/10/2026 13:38`. */
export function formatWallClock(value: string): string {
  return `${formatDate(value.slice(0, 10))} ${value.slice(11, 16)}`;
}

/** `2026-10-19` → `19/10/2026`. */
export function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/** `{ from: '2026-10-19', to: '2026-10-25' }` → `19/10/2026 – 25/10/2026`. */
export function formatPeriod(period: { from: string; to: string }): string {
  return `${formatDate(period.from)} – ${formatDate(period.to)}`;
}

/** `18.8679…` → `18,87 %` (same format as the backend texts); `null` → `No calculable`. */
export function formatPercent(value: number | null): string {
  return value === null ? 'No calculable' : `${decimalFormat.format(value)} %`;
}

/** `1234` → `1.234`. */
export function formatInteger(value: number): string {
  return integerFormat.format(value);
}

/** `1` → `1.º`. */
export function formatOrdinal(position: number): string {
  return `${position}.º`;
}
