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

/** Same as the web: `$ 1.234,56` with a no-break space after the sign. */
const moneyFormat = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const signedMoneyFormat = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  signDisplay: 'exceptZero',
});

/** `1234.56` → `$ 1.234,56`; `null` → `No calculable`. */
export function formatMoney(value: number | null): string {
  return value === null ? NOT_CALCULABLE : moneyFormat.format(value);
}

/** `2619.76` → `+$ 2.619,76`, `-6000` → `-$ 6.000,00`, `0` → `$ 0,00`. */
export function formatSignedMoney(value: number): string {
  return signedMoneyFormat.format(value);
}

/** `12.3456` → `12,35`; `null` → `No calculable`. */
export function formatDecimal(value: number | null): string {
  return value === null ? NOT_CALCULABLE : decimalFormat.format(value);
}

/** `2026-10-19T13:38:00` → `19/10` (sliced, never parsed). */
export function formatDayMonth(value: string): string {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}`;
}

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

/** `plural(1, 'turno', 'turnos')` → `1 turno`; `plural(1234, …)` → `1.234 turnos`. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatInteger(count)} ${count === 1 ? singular : pluralForm}`;
}
