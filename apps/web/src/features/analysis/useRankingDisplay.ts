import type { RankingEntry } from '@grido/shared';
import { useState } from 'react';

/**
 * Display-only search and sort of the API ranking (FRONTEND_RULES). It re-orders and filters rows
 * for reading; it never changes `entry.position`, eligibility or any figure.
 */

export type SortKey =
  'position' | 'cashierName' | 'tickets' | 'activadas' | 'aceptadas' | 'effectiveness';

export type SortDirection = 'ascending' | 'descending';

export interface RankingSort {
  key: SortKey;
  direction: SortDirection;
}

/** Names and the official position read best A→Z / 1→N; figures read best high→low. */
export function defaultDirection(key: SortKey): SortDirection {
  return key === 'position' || key === 'cashierName' ? 'ascending' : 'descending';
}

/** Lowercase without diacritics: `Lucía` → `lucia`. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function filterByName(entries: readonly RankingEntry[], query: string): RankingEntry[] {
  const needle = normalize(query.trim());
  return entries.filter((entry) => normalize(entry.cashierName).includes(needle));
}

const collator = new Intl.Collator('es');

/** Stable: rows that compare equal keep the API order. "No calculable" always goes last. */
export function sortEntries(
  entries: readonly RankingEntry[],
  sort: RankingSort | null,
): RankingEntry[] {
  if (!sort) return [...entries];
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return [...entries].sort((a, b) => {
    if (sort.key === 'cashierName') return sign * collator.compare(a.cashierName, b.cashierName);
    const left = a[sort.key];
    const right = b[sort.key];
    if (left === null || right === null) {
      return left === right ? 0 : left === null ? 1 : -1;
    }
    return sign * (left - right);
  });
}

export function useRankingDisplay(entries: readonly RankingEntry[]) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<RankingSort | null>(null);

  /** Header click: a new column starts in its default direction, the same column flips. */
  function toggleSort(key: SortKey) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
        : { key, direction: defaultDirection(key) },
    );
  }

  function selectSort(key: SortKey) {
    setSort({ key, direction: defaultDirection(key) });
  }

  return {
    query,
    setQuery,
    sort,
    toggleSort,
    selectSort,
    rows: sortEntries(filterByName(entries, query), sort),
  };
}
