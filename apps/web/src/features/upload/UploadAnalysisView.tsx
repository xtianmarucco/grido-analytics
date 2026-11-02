import type { ImportWarning } from '@grido/shared';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { type DragEvent, useId, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { plural } from '@/lib/plural';
import { WarningList } from './WarningList';

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'processing'; fileName: string }
  | { kind: 'success'; fileName: string; shiftCount: number; warningCount: number }
  | { kind: 'error'; fileName: string; message: string; warnings: ImportWarning[] };

export interface UploadAnalysisViewProps {
  state: UploadState;
  onFileSelected: (file: File) => void;
}

const ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function statusText(state: UploadState): string {
  if (state.kind === 'processing') return `Procesando ${state.fileName}…`;
  if (state.kind !== 'success') return '';
  const shifts = plural(state.shiftCount, 'turno procesado', 'turnos procesados');
  const warnings = state.warningCount;
  return warnings === 0
    ? `${shifts}.`
    : `${shifts}, ${plural(warnings, 'advertencia', 'advertencias')}.`;
}

/** Presentational: upload zone, live status and rejection details. Results render below it. */
export function UploadAnalysisView({ state, onFileSelected }: UploadAnalysisViewProps) {
  const processing = state.kind === 'processing';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte semanal de turnos</CardTitle>
        <CardDescription>
          Cargue el Excel de cierre de turnos (.xlsx, hasta 5 MB). El archivo se procesa en este
          equipo y no se guarda.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.kind === 'success' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="font-medium break-all">{state.fileName}</span>
              </span>
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="size-4" aria-hidden />
                Procesado
              </span>
            </p>
            <FilePicker
              label="Analizar otro archivo"
              icon={RotateCcw}
              variant="outline"
              onFileSelected={onFileSelected}
            />
          </div>
        ) : (
          <DropZone
            label={state.kind === 'error' ? 'Seleccionar otro archivo' : 'Seleccionar archivo'}
            disabled={processing}
            onFileSelected={onFileSelected}
          />
        )}

        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm empty:sr-only"
        >
          {processing && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {statusText(state) || null}
        </p>

        {state.kind === 'error' && (
          <>
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>No se pudo procesar {state.fileName}</AlertTitle>
              <AlertDescription>
                <p>{state.message}</p>
              </AlertDescription>
            </Alert>
            <WarningList warnings={state.warnings} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface FilePickerProps {
  label: string;
  icon?: typeof Upload;
  variant?: 'default' | 'outline';
  disabled?: boolean;
  onFileSelected: (file: File) => void;
}

/** Native file input (keyboard and screen-reader friendly) styled through its label. */
function FilePicker({
  label,
  icon: Icon = Upload,
  variant = 'default',
  disabled,
  onFileSelected,
}: FilePickerProps) {
  const id = useId();
  return (
    <div>
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        className="peer sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          // Reset so choosing the same file again still triggers a new upload.
          event.currentTarget.value = '';
          if (file) onFileSelected(file);
        }}
      />
      <label
        htmlFor={id}
        className={cn(
          buttonVariants({ variant }),
          'cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:pointer-events-none peer-disabled:opacity-50',
        )}
      >
        <Icon aria-hidden />
        {label}
      </label>
    </div>
  );
}

function DropZone({
  label,
  disabled,
  onFileSelected,
}: {
  label: string;
  disabled: boolean;
  onFileSelected: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFileSelected(file);
  }

  return (
    <div
      data-testid="drop-zone"
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">Arrastre el archivo aquí o</p>
      <FilePicker label={label} disabled={disabled} onFileSelected={onFileSelected} />
    </div>
  );
}
