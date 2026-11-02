/**
 * Display formatting for the API's wall-clock strings. They are sliced, never parsed with
 * `new Date()`, so the browser's timezone can never shift them.
 */

/** `2026-10-19T13:38:00` → `19/10/2026 13:38`. */
export function formatWallClock(value: string): string {
  return `${formatDate(value.slice(0, 10))} ${value.slice(11, 16)}`;
}

/** `2026-10-19` → `19/10/2026`. */
export function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
