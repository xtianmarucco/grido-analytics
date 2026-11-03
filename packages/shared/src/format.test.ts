import { describe, expect, it } from 'vitest';

import { formatShiftStart, formatShiftStarts } from './format.js';

describe('formatShiftStart', () => {
  it.each([
    ['2026-10-19T13:38:00', 'lun 19/10 13:38'],
    ['2026-10-20T08:00:00', 'mar 20/10 08:00'],
    ['2026-10-21T10:57:59', 'mié 21/10 10:57'],
    ['2026-10-22T15:00:00', 'jue 22/10 15:00'],
    ['2026-10-23T10:55:00', 'vie 23/10 10:55'],
    ['2026-10-24T23:59:59', 'sáb 24/10 23:59'],
    ['2026-10-25T00:00:00', 'dom 25/10 00:00'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatShiftStart(value)).toBe(expected);
  });

  it('handles leap days and year boundaries from the wall-clock date alone', () => {
    expect(formatShiftStart('2024-02-29T09:00:00')).toBe('jue 29/02 09:00');
    expect(formatShiftStart('2025-12-31T23:30:00')).toBe('mié 31/12 23:30');
    expect(formatShiftStart('2026-01-01T00:15:00')).toBe('jue 01/01 00:15');
  });
});

describe('formatShiftStarts', () => {
  it('joins the shift starts with a middle dot, in the given order', () => {
    expect(
      formatShiftStarts([
        { startedAt: '2026-10-19T10:59:00' },
        { startedAt: '2026-10-21T10:57:00' },
        { startedAt: '2026-10-23T10:55:00' },
      ]),
    ).toBe('lun 19/10 10:59 · mié 21/10 10:57 · vie 23/10 10:55');
  });

  it('returns an empty string without shifts', () => {
    expect(formatShiftStarts([])).toBe('');
  });
});
