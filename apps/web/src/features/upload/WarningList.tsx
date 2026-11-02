import type { ImportWarning } from '@grido/shared';
import { TriangleAlert } from 'lucide-react';

import { plural } from './plural';

/** Rows the import excluded or merged. Never hidden: every warning is listed. */
export function WarningList({ warnings }: { warnings: readonly ImportWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <section
      aria-labelledby="import-warnings-title"
      className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm"
    >
      <h3 id="import-warnings-title" className="flex items-center gap-2 font-medium text-warning">
        <TriangleAlert className="size-4" aria-hidden />
        {plural(warnings.length, 'advertencia', 'advertencias')}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning, index) => (
          <li key={`${warning.code}-${warning.row ?? ''}-${warning.turno ?? ''}-${index}`}>
            {warning.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
