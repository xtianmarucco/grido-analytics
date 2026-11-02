import { describe, expect, it } from 'vitest';

import { parseWallClock } from './cell-values.js';

describe('parseWallClock', () => {
  it('reads a Date as wall-clock time rounded to the second', () => {
    expect(parseWallClock(new Date(Date.UTC(2026, 9, 19, 17, 8, 59, 999)))).toBe(
      '2026-10-19T17:09:00',
    );
  });

  it('reads a plain number as an Excel day serial', () => {
    expect(parseWallClock(46_314.5)).toBe('2026-10-19T12:00:00');
  });

  it('rejects an invalid Date', () => {
    expect(parseWallClock(new Date(Number.NaN))).toBeUndefined();
  });

  it('rejects a serial outside the range a Date can represent', () => {
    expect(parseWallClock(1e15)).toBeUndefined();
  });

  it('rejects a serial outside the supported years', () => {
    expect(parseWallClock(1e7)).toBeUndefined();
  });
});
