import { describe, expect, it } from 'vitest';

import { axisMax, axisTicks } from './chartScale';

describe('axisMax', () => {
  it('picks the next round step at or above the highest value, from 0', () => {
    expect(axisMax([18.87, 1.92, 0])).toBe(25);
    expect(axisMax([1.92])).toBe(5);
    expect(axisMax([0, 0])).toBe(5);
    expect(axisMax([10])).toBe(10);
    expect(axisMax([60])).toBe(100);
    expect(axisMax([100])).toBe(100);
  });
});

describe('axisTicks', () => {
  it('splits the axis into five equal steps starting at 0', () => {
    expect(axisTicks(25)).toEqual([0, 5, 10, 15, 20, 25]);
    expect(axisTicks(100)).toEqual([0, 20, 40, 60, 80, 100]);
  });
});
