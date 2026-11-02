import type { ReportFormat } from '@grido/shared';
import { AlertCircle, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const FORMATS: { format: ReportFormat; name: string; icon: typeof FileText }[] = [
  { format: 'pdf', name: 'PDF', icon: FileText },
  { format: 'xlsx', name: 'Excel', icon: FileSpreadsheet },
];

export interface ReportDownloadsViewProps {
  viewLabel: string;
  /** The format being generated, if any. Both buttons are disabled meanwhile. */
  generating: ReportFormat | undefined;
  /** Spanish message of the last failed download. */
  error: string | undefined;
  onDownload: (format: ReportFormat) => void;
}

/** Presentational: "Descargar PDF / Excel · <vista>" buttons with their states (guide §8). */
export function ReportDownloadsView({
  viewLabel,
  generating,
  error,
  onDownload,
}: ReportDownloadsViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {FORMATS.map(({ format, name, icon: Icon }) => {
          const running = generating === format;
          return (
            <Button
              key={format}
              type="button"
              variant="outline"
              disabled={generating !== undefined}
              onClick={() => onDownload(format)}
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Icon aria-hidden />
              )}
              {running ? 'Generando…' : `Descargar ${name} · ${viewLabel}`}
            </Button>
          );
        })}
        {generating !== undefined && (
          <p role="status" className="text-sm text-muted-foreground">
            {`Generando… El informe ${generating === 'pdf' ? 'PDF' : 'Excel'} de ${viewLabel} se descargará al terminar.`}
          </p>
        )}
      </div>
      {error !== undefined && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>No se pudo generar el informe</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
