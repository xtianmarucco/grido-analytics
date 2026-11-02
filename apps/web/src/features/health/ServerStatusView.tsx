import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type ServerStatusState =
  | { kind: 'loading' }
  | { kind: 'connected'; apiStatus: string; checkedAt: Date }
  | { kind: 'error'; retrying: boolean };

export interface ServerStatusViewProps {
  state: ServerStatusState;
  onRetry: () => void;
}

const timeFormat = new Intl.DateTimeFormat('es-AR', { timeStyle: 'medium' });

/** Presentational: renders one of the three connection states. User-facing copy is Spanish. */
export function ServerStatusView({ state, onRetry }: ServerStatusViewProps) {
  if (state.kind === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Verificando la conexión con el servidor…
      </p>
    );
  }

  if (state.kind === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden />
        <AlertTitle>No se pudo conectar con el servidor</AlertTitle>
        <AlertDescription>
          <p>Verifique que la aplicación esté en ejecución e intente nuevamente.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-foreground"
            onClick={onRetry}
            disabled={state.retrying}
          >
            <RefreshCw className={state.retrying ? 'animate-spin' : undefined} aria-hidden />
            {state.retrying ? 'Reintentando…' : 'Reintentar'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div role="status" className="flex flex-col gap-2">
      <Badge variant="success" className="text-sm">
        <CheckCircle2 aria-hidden />
        Conectado al servidor
      </Badge>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <dt>Estado de la API</dt>
        <dd className="font-medium text-foreground">{state.apiStatus}</dd>
        <dt>Última verificación</dt>
        <dd className="font-medium text-foreground">{timeFormat.format(state.checkedAt)}</dd>
      </dl>
    </div>
  );
}
