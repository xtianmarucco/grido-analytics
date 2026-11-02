import type { EligibilityReasonCode, RankingEntry } from '@grido/shared';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  CircleDashed,
  Info,
  Receipt,
  Search,
} from 'lucide-react';
import { useId } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatInteger, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

import { type RankingSort, type SortKey, useRankingDisplay } from './useRankingDisplay';

export interface RankingTableProps {
  /** The API ranking, best first. */
  entries: readonly RankingEntry[];
  /** Branch names by code, only for the combined view (adds them under each name). */
  branchNames?: Readonly<Record<number, string>> | undefined;
}

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'position', label: 'Pos.', numeric: false },
  { key: 'cashierName', label: 'Cajero', numeric: false },
  { key: 'tickets', label: 'Tickets', numeric: true },
  { key: 'activadas', label: 'Activadas', numeric: true },
  { key: 'aceptadas', label: 'Aceptadas', numeric: true },
  { key: 'effectiveness', label: 'Efectividad', numeric: true },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'position', label: 'Puesto oficial' },
  { key: 'cashierName', label: 'Cajero' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'activadas', label: 'Activadas' },
  { key: 'aceptadas', label: 'Aceptadas' },
  { key: 'effectiveness', label: 'Efectividad' },
];

const REASON_ICONS: Record<EligibilityReasonCode, typeof Info> = {
  MIN_TICKETS: Receipt,
  NO_ACCEPTED: CircleDashed,
  NOT_CALCULABLE: Info,
};

const numeric = 'text-right tabular-nums';

/** Presentational: API ranking as a table (md+) and as cards (phone), with display-only tools. */
export function RankingTable({ entries, branchNames }: RankingTableProps) {
  const searchId = useId();
  const sortId = useId();
  const { query, setQuery, sort, toggleSort, selectSort, rows } = useRankingDisplay(entries);
  const tiedPositions = new Set(
    entries
      .filter((entry, index) => entries.findIndex((e) => e.position === entry.position) !== index)
      .map((entry) => entry.position),
  );
  const branchesOf = (entry: RankingEntry) =>
    branchNames ? entry.branchCodes.map((code) => branchNames[code] ?? code).join(', ') : null;

  return (
    <section aria-labelledby="ranking-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 id="ranking-title" className="text-lg font-semibold">
          Ranking
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor={searchId} className="sr-only">
              Buscar cajero
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Buscar cajero…"
              className="min-h-11 w-full rounded-md border border-input bg-card py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground md:min-h-9 md:w-64"
            />
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <label htmlFor={sortId} className="text-sm text-muted-foreground">
              Ordenar por
            </label>
            <select
              id={sortId}
              value={sort?.key ?? 'position'}
              onChange={(event) => selectSort(event.currentTarget.value as SortKey)}
              className="min-h-11 flex-1 rounded-md border border-input bg-card px-3 text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          {`Ningún cajero coincide con «${query.trim()}».`}
        </p>
      ) : (
        <>
          <div className="hidden rounded-xl border bg-card md:block">
            <Table>
              <TableCaption className="mb-3">Ranking de cajeros de la vista.</TableCaption>
              <TableHeader className="bg-muted">
                <TableRow>
                  {COLUMNS.map((column) => (
                    <SortableHead
                      key={column.key}
                      column={column}
                      sort={sort}
                      onSort={toggleSort}
                    />
                  ))}
                  <TableHead scope="col">Podio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry) => (
                  <TableRow key={entry.cashierKey} className="align-top">
                    <TableCell className="tabular-nums">
                      {entry.position}
                      {tiedPositions.has(entry.position) && <TieCaption />}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="font-medium break-words">{entry.cashierName}</span>
                      {branchesOf(entry) && (
                        <span className="block text-xs text-muted-foreground">
                          {branchesOf(entry)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={numeric}>{formatInteger(entry.tickets)}</TableCell>
                    <TableCell className={numeric}>{formatInteger(entry.activadas)}</TableCell>
                    <TableCell className={numeric}>{formatInteger(entry.aceptadas)}</TableCell>
                    <TableCell
                      className={cn(
                        numeric,
                        entry.effectiveness === null && 'text-muted-foreground',
                      )}
                    >
                      {formatPercent(entry.effectiveness)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Eligibility entry={entry} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul aria-label="Ranking de cajeros" className="flex flex-col gap-3 md:hidden">
            {rows.map((entry) => (
              <li
                key={entry.cashierKey}
                className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg font-semibold tabular-nums">{entry.position}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold break-words">{entry.cashierName}</h3>
                    {branchesOf(entry) && (
                      <p className="text-xs text-muted-foreground">{branchesOf(entry)}</p>
                    )}
                    {tiedPositions.has(entry.position) && <TieCaption />}
                  </div>
                  <span
                    className={cn(
                      'font-semibold whitespace-nowrap tabular-nums',
                      entry.effectiveness === null && 'text-muted-foreground',
                    )}
                  >
                    {formatPercent(entry.effectiveness)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {`Tickets ${formatInteger(entry.tickets)} · Activadas ${formatInteger(entry.activadas)} · Aceptadas ${formatInteger(entry.aceptadas)}`}
                </p>
                <Eligibility entry={entry} />
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        El puesto oficial lo calcula el sistema; ordenar la tabla no cambia el ranking.
      </p>
    </section>
  );
}

function SortableHead({
  column,
  sort,
  onSort,
}: {
  column: (typeof COLUMNS)[number];
  sort: RankingSort | null;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === column.key;
  const Icon = !active ? ArrowUpDown : sort.direction === 'ascending' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      scope="col"
      aria-sort={active ? sort.direction : undefined}
      className={column.numeric ? 'text-right' : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm font-medium hover:text-primary',
          column.numeric && 'flex-row-reverse',
        )}
      >
        {column.label}
        <Icon
          className={cn('size-3.5', active ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

function TieCaption() {
  return <span className="block text-xs text-muted-foreground">Empate</span>;
}

/** Eligibility from the API: a text badge plus every reason message as-is. Never error-styled. */
function Eligibility({ entry }: { entry: RankingEntry }) {
  if (entry.eligible) {
    return (
      <Badge variant="success">
        <CheckCircle2 aria-hidden />
        Participa
      </Badge>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="muted">
        <CircleDashed aria-hidden />
        No participa
      </Badge>
      <div className="flex flex-col gap-0.5">
        {entry.ineligibilityReasons.map((reason) => {
          const Icon = REASON_ICONS[reason.code];
          return (
            <p
              key={reason.code}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Icon className="size-3.5 shrink-0 text-info" aria-hidden />
              {reason.message}
            </p>
          );
        })}
      </div>
    </div>
  );
}
