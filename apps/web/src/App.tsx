import { ServerStatus } from '@/features/health/ServerStatus';
import { UploadAnalysis } from '@/features/upload/UploadAnalysis';

export function App() {
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Grido Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Análisis semanal de sobreventa por cajero
            </p>
          </div>
          <ServerStatus />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <UploadAnalysis />
      </main>
    </div>
  );
}
