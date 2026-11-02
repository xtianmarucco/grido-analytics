import { formatInteger } from './format';

/** `plural(1, 'turno', 'turnos')` → `1 turno`; `plural(1234, …)` → `1.234 turnos`. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatInteger(count)} ${count === 1 ? singular : pluralForm}`;
}
