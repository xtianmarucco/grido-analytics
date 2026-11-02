import type { ImportResult } from '@grido/shared';
import { ChevronDown, TriangleAlert } from 'lucide-react';

import { ImportPreview } from '@/features/upload/ImportPreview';
import { plural } from '@/lib/plural';

export const IMPORTED_DATA_ID = 'datos-importados';

export interface ImportedDataProps {
  result: ImportResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Presentational: the Sprint 2 import preview in a native, collapsed-by-default section. */
export function ImportedData({ result, open, onOpenChange }: ImportedDataProps) {
  const warnings = result.warnings.length;

  return (
    <details
      id={IMPORTED_DATA_ID}
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      className="group rounded-xl border bg-card shadow-xs"
    >
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 md:px-6 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
        <span className="font-semibold">Datos importados</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {`${plural(result.shifts.length, 'turno', 'turnos')} · `}
          <span
            className={
              warnings > 0 ? 'flex items-center gap-1 font-medium text-warning' : undefined
            }
          >
            {warnings > 0 && <TriangleAlert className="size-4" aria-hidden />}
            {plural(warnings, 'advertencia', 'advertencias')}
          </span>
        </span>
      </summary>
      <div className="border-t px-4 py-4 md:px-6">
        <ImportPreview result={result} />
      </div>
    </details>
  );
}
