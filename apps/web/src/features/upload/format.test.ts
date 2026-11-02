import { describe, expect, it } from 'vitest';

import { formatDate, formatWallClock } from './format';

describe('formatWallClock', () => {
  it('formats the wall-clock string as dd/mm/yyyy HH:mm without timezone conversion', () => {
    expect(formatWallClock('2026-10-19T13:38:00')).toBe('19/10/2026 13:38');
    expect(formatWallClock('2026-10-25T00:05:59')).toBe('25/10/2026 00:05');
  });
});

describe('formatDate', () => {
  it('formats a calendar date as dd/mm/yyyy', () => {
    expect(formatDate('2026-10-05')).toBe('05/10/2026');
  });
});
