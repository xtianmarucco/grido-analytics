import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type ServerStatusState =
  | { kind: 'loading' }
  | { kind: 'connected'; checkedAt: Date }
  | { kind: 'error'; retrying: boolean };

export interface ServerStatusViewProps {
  state: ServerStatusState;
  onRetry: () => void;
}

const timeFormat = new Intl.DateTimeFormat('es-AR', { timeStyle: 'medium' });

/** Presentational: compact connection indicator for the page header. Copy is Spanish. */
export function ServerStatusView({ state, onRetry }: ServerStatusViewProps) {
  if (state.kind === 'loading') {
    return (
      <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Verificando el servidor…
      </p>
    );
  }

  if (state.kind === 'error') {
    return (
      <div role="alert" className="flex items-center gap-2 text-xs text-destructive">
        <AlertCircle className="size-3.5" aria-hidden />
        <span>No se pudo conectar con el servidor</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-foreground"
          onClick={onRetry}
          disabled={state.retrying}
        >
          <RefreshCw className={state.retrying ? 'animate-spin' : undefined} aria-hidden />
          {state.retrying ? 'Reintentando…' : 'Reintentar'}
        </Button>
      </div>
    );
  }

  return (
    <p role="status">
      <Badge variant="success" title={`Última verificación: ${timeFormat.format(state.checkedAt)}`}>
        <CheckCircle2 aria-hidden />
        Conectado al servidor
      </Badge>
    </p>
  );
}
