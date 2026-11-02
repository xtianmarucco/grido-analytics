import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerStatus } from '@/features/health/ServerStatus';

export function App() {
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight">Grido Analytics</h1>
          <p className="text-sm text-muted-foreground">Análisis semanal de sobreventa por cajero</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Estado del sistema</CardTitle>
            <CardDescription>Conexión entre esta pantalla y el servidor local.</CardDescription>
          </CardHeader>
          <CardContent>
            <ServerStatus />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
