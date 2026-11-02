import { describe, expect, it } from 'vitest';

import { parseMoney, parseNonNegativeMoney, parseWallClock } from './cell-values.js';

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

describe('parseMoney', () => {
  it.each<[unknown, number]>([
    [132600.01, 132600.01],
    [-1530, -1530],
    [0, 0],
    ['  250.5 ', 250.5],
    ['-12', -12],
    [0.1 + 0.2, 0.3],
    [10.005, 10.01],
  ])('reads %s as %s (rounded to cents)', (cell, expected) => {
    expect(parseMoney(cell as never)).toBe(expected);
  });

  it.each([null, '', 'abc', '1.234,56', '$ 10', true, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %s',
    (cell) => {
      expect(parseMoney(cell as never)).toBeUndefined();
    },
  );

  it('rejects a Date', () => {
    expect(parseMoney(new Date('2026-10-19T00:00:00Z'))).toBeUndefined();
  });
});

describe('parseNonNegativeMoney', () => {
  it('accepts zero and positive amounts', () => {
    expect(parseNonNegativeMoney(0)).toBe(0);
    expect(parseNonNegativeMoney(99.99)).toBe(99.99);
  });

  it('rejects negative amounts', () => {
    expect(parseNonNegativeMoney(-0.01)).toBeUndefined();
  });
});
