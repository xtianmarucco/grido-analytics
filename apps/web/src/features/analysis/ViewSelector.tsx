import type { AnalysisView } from '@grido/shared';
import { useId } from 'react';

export interface ViewSelectorProps {
  views: readonly Pick<AnalysisView, 'id' | 'label'>[];
  selectedId: string;
  onSelect: (viewId: string) => void;
  /** Every option is disabled (e.g. while a report is generating). */
  disabled?: boolean;
}

/**
 * Presentational segmented control. Native radios give arrow-key navigation and one tab stop;
 * labels come from the API (`view.label`), in API order.
 */
export function ViewSelector({ views, selectedId, onSelect, disabled = false }: ViewSelectorProps) {
  const labelId = useId();
  const name = useId();

  return (
    <div className="flex w-full flex-col gap-1.5 md:w-auto md:flex-row md:items-center md:gap-3">
      <span id={labelId} className="text-sm font-medium text-muted-foreground">
        Vista
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
        className="grid w-full auto-cols-fr grid-flow-col gap-1 rounded-lg border border-input bg-secondary p-1 md:inline-grid md:w-auto"
      >
        {views.map((view) => (
          <label
            key={view.id}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 motion-reduce:transition-none md:min-h-9"
          >
            <input
              type="radio"
              name={name}
              value={view.id}
              checked={view.id === selectedId}
              disabled={disabled}
              onChange={() => onSelect(view.id)}
              className="sr-only"
            />
            {view.label}
          </label>
        ))}
      </div>
    </div>
  );
}
