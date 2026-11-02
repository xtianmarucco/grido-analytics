import type { RankingEntry } from '@grido/shared';
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { formatPercent } from '@/lib/format';

import { axisMax, axisTicks } from './chartScale';

const ROW_HEIGHT = 40;
const AXIS_HEIGHT = 32;

/**
 * Presentational: one horizontal bar per cashier with calculable effectiveness, in ranking
 * order (guide §7.6). The SVG is decorative for assistive tech; the visually hidden table carries
 * the same values. Kept thin: every value comes from the API ranking.
 */
export function EffectivenessChart({ entries }: { entries: readonly RankingEntry[] }) {
  const bars = entries.flatMap((entry) =>
    entry.effectiveness === null
      ? []
      : [{ key: entry.cashierKey, name: entry.cashierName, value: entry.effectiveness }],
  );
  const max = axisMax(bars.map((bar) => bar.value));
  const notCalculable = entries.filter((entry) => entry.effectiveness === null);

  return (
    <section aria-labelledby="chart-title" className="flex flex-col gap-3">
      <h2 id="chart-title" className="text-lg font-semibold">
        Efectividad por cajero
      </h2>
      {bars.length < 2 ? (
        <p className="rounded-xl border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          El gráfico se muestra cuando al menos dos cajeros tienen efectividad calculable.
        </p>
      ) : (
        <figure
          aria-labelledby="chart-caption"
          className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs md:p-6"
        >
          <figcaption id="chart-caption" className="sr-only">
            Efectividad por cajero
          </figcaption>
          <div aria-hidden className="w-full">
            <ResponsiveContainer width="100%" height={bars.length * ROW_HEIGHT + AXIS_HEIGHT}>
              <BarChart
                data={bars}
                layout="vertical"
                margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  domain={[0, max]}
                  ticks={axisTicks(max)}
                  tickFormatter={(value: number) => `${value} %`}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fill: 'var(--foreground)', fontSize: 14 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar
                  dataKey="value"
                  fill="var(--chart-1)"
                  background={{ fill: 'var(--chart-track)', radius: 4 }}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  minPointSize={2}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(value) => formatPercent(Number(value))}
                    style={{
                      fill: 'var(--foreground)',
                      fontSize: 13,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {notCalculable.length > 0 && (
            <ul aria-label="Sin efectividad calculable" className="flex flex-col gap-1 text-sm">
              {notCalculable.map((entry) => (
                <li key={entry.cashierKey} className="text-muted-foreground">
                  {`${entry.cashierName}: No calculable`}
                </li>
              ))}
            </ul>
          )}
          <table className="sr-only">
            <thead>
              <tr>
                <th scope="col">Cajero</th>
                <th scope="col">Efectividad</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.cashierKey}>
                  <td>{entry.cashierName}</td>
                  <td>{formatPercent(entry.effectiveness)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </section>
  );
}
