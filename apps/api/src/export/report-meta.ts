import type { ImportResult } from '@grido/shared';

/** Context a report needs besides the view itself. */
export interface ReportMeta {
  /** Branch display names by code, from the import (`1 → Almirante`). */
  branchNames: Readonly<Record<number, string>>;
  /** When the report was generated; formatted in the server's local time. */
  generatedAt: Date;
}

export function reportMeta(result: ImportResult, generatedAt: Date = new Date()): ReportMeta {
  return {
    branchNames: Object.fromEntries(result.branches.map((branch) => [branch.code, branch.name])),
    generatedAt,
  };
}
