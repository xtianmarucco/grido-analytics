/** `plural(1, 'turno', 'turnos')` → `1 turno`; `plural(2, …)` → `2 turnos`. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
