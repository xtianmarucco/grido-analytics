import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDayMonth,
  formatDecimal,
  formatMoney,
  formatSignedMoney,
  formatInteger,
  formatOrdinal,
  formatPercent,
  formatPeriod,
  formatWallClock,
} from './format';

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

describe('formatPeriod', () => {
  it('joins both dates with a spaced en dash', () => {
    expect(formatPeriod({ from: '2026-10-19', to: '2026-10-25' })).toBe('19/10/2026 – 25/10/2026');
  });
});

describe('formatPercent', () => {
  it('uses two es-AR decimals and a spaced percent sign, like the backend texts', () => {
    expect(formatPercent(18.867924528301888)).toBe('18,87 %');
    expect(formatPercent(0)).toBe('0,00 %');
    expect(formatPercent(100)).toBe('100,00 %');
  });

  it('shows "No calculable" for null', () => {
    expect(formatPercent(null)).toBe('No calculable');
  });
});

describe('formatInteger', () => {
  it('uses the es-AR thousands separator', () => {
    expect(formatInteger(0)).toBe('0');
    expect(formatInteger(812)).toBe('812');
    expect(formatInteger(1234)).toBe('1.234');
    expect(formatInteger(12345)).toBe('12.345');
  });
});

describe('formatOrdinal', () => {
  it('formats a podium position as an ordinal', () => {
    expect(formatOrdinal(1)).toBe('1.º');
    expect(formatOrdinal(2)).toBe('2.º');
  });
});

describe('formatMoney', () => {
  it('formats pesos as es-AR currency with cents', () => {
    expect(formatMoney(1234.56)).toBe('$\u00a01.234,56');
    expect(formatMoney(0)).toBe('$\u00a00,00');
    expect(formatMoney(-8930.81)).toBe('-$\u00a08.930,81');
  });

  it('shows "No calculable" for null', () => {
    expect(formatMoney(null)).toBe('No calculable');
  });
});

describe('formatSignedMoney', () => {
  it('always shows the sign of a non-zero amount', () => {
    expect(formatSignedMoney(2619.76)).toBe('+$\u00a02.619,76');
    expect(formatSignedMoney(-6000)).toBe('-$\u00a06.000,00');
    expect(formatSignedMoney(0)).toBe('$\u00a00,00');
  });
});

describe('formatDecimal', () => {
  it('formats with two decimals; null is "No calculable"', () => {
    expect(formatDecimal(12.3456)).toBe('12,35');
    expect(formatDecimal(null)).toBe('No calculable');
  });
});

describe('formatDayMonth', () => {
  it('slices dd/mm from a wall-clock string', () => {
    expect(formatDayMonth('2026-10-19T13:38:00')).toBe('19/10');
  });
});
