/** Display-only axis bounds for the effectiveness chart (guide §7.6): linear, always from 0. */

const STEPS = [5, 10, 25, 50, 100] as const;

/** The smallest round step at or above the highest value; percentages never exceed 100. */
export function axisMax(values: readonly number[]): number {
  const highest = Math.max(0, ...values);
  return STEPS.find((step) => step >= highest) ?? 100;
}

/** Five equal intervals from 0 to `max`. */
export function axisTicks(max: number): number[] {
  return Array.from({ length: 6 }, (_, index) => (max / 5) * index);
}
