import type {
  CashControl as CashControlData,
  CashierCashIndicators,
  LowCashSignal,
  ShiftAlert,
  ShiftSlot,
} from '@grido/shared';
import { Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatDayMonth,
  formatDecimal,
  formatMoney,
  formatPercent,
  formatSignedMoney,
} from '@/lib/format';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';

export const LIMITATION_NOTE =
  'Estos datos solo incluyen ventas tickeadas; las señales indican qué revisar, no prueban irregularidades.';

export const NO_SIGNALS_TEXT = 'Sin señales esta semana';

const SLOT_LABELS: Record<ShiftSlot, string> = { dia: 'Día', noche: 'Noche' };

const numeric = 'text-right tabular-nums';

export interface CashControlProps {
  /** The API cash control of the selected view. */
  cashControl: CashControlData;
  /** Combined view: show the branch of each alert and signal. */
  combined?: boolean;
}

/**
 * Presentational: sales mix, cash-count differences and review signals from the API. Signals are
 * amber ("Señal para revisar"), never red: they point at what to check, not at a fault.
 */
export function CashControl({ cashControl, combined = false }: CashControlProps) {
  const { cashiers, shiftAlerts, lowCashSignals } = cashControl;

  return (
    <section aria-labelledby="cash-control-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="cash-control-title" className="text-lg font-semibold">
          Control de caja
        </h2>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          {LIMITATION_NOTE}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SignalGroup title="Diferencias de caja para revisar" empty={shiftAlerts.length === 0}>
          {shiftAlerts.map((alert) => (
            <AlertItem
              key={`${alert.branchCode}-${alert.turno}`}
              alert={alert}
              combined={combined}
            />
          ))}
        </SignalGroup>
        <SignalGroup
          title="Efectivo bajo frente al resto del horario"
          empty={lowCashSignals.length === 0}
        >
          {lowCashSignals.map((signal) => (
            <SignalItem
              key={`${signal.branchCode}-${signal.slot}-${signal.cashierKey}`}
              signal={signal}
              combined={combined}
            />
          ))}
        </SignalGroup>
      </div>

      {cashiers.length > 0 && <CashierIndicators cashiers={cashiers} />}
    </section>
  );
}

function SignalGroup({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {empty ? (
        <p className="rounded-xl border bg-muted px-4 py-4 text-center text-sm text-muted-foreground">
          {NO_SIGNALS_TEXT}
        </p>
      ) : (
        <ul aria-label={title} className="flex flex-col gap-2">
          {children}
        </ul>
      )}
    </div>
  );
}

function SignalCard({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-l-4 border-l-warning bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">
          <TriangleAlert aria-hidden />
          Señal para revisar
        </Badge>
        <span className="text-sm font-medium break-words">{heading}</span>
      </div>
      {children}
    </li>
  );
}

function AlertItem({ alert, combined }: { alert: ShiftAlert; combined: boolean }) {
  const branch = combined ? `${alert.branchName} · ` : '';
  const share =
    alert.percentOfCash === null
      ? 'Sin efectivo en el turno'
      : `${formatPercent(alert.percentOfCash)} del efectivo`;
  return (
    <SignalCard
      heading={`${branch}${formatDayMonth(alert.startedAt)} · ${SLOT_LABELS[alert.slot]} · ${alert.cashierName}`}
    >
      <p className="text-sm tabular-nums">
        <span className="font-semibold">{formatSignedMoney(alert.difference)}</span>
        {` · ${share}`}
      </p>
      <p className="text-sm text-muted-foreground">{alert.message}</p>
    </SignalCard>
  );
}

function SignalItem({ signal, combined }: { signal: LowCashSignal; combined: boolean }) {
  const branch = combined ? `${signal.branchName} · ` : '';
  return (
    <SignalCard heading={`${branch}${SLOT_LABELS[signal.slot]} · ${signal.cashierName}`}>
      <p className="text-sm tabular-nums">
        {`Efectivo ${formatPercent(signal.cashierShare)} · resto ${formatPercent(signal.peersShare)} · `}
        <span className="font-semibold">{`${formatDecimal(signal.gapPoints)} puntos menos`}</span>
      </p>
      <p className="text-sm text-muted-foreground">{signal.message}</p>
    </SignalCard>
  );
}

function slotRates(cashier: CashierCashIndicators): string {
  return cashier.slots
    .map((slot) => `${SLOT_LABELS[slot.slot]} ${formatDecimal(slot.ticketsPerHour)}`)
    .join(' · ');
}

function DifferenceFigure({ cashier }: { cashier: CashierCashIndicators }) {
  const { net, alertedShifts } = cashier.difference;
  return (
    <>
      <span>{formatSignedMoney(net)}</span>
      {alertedShifts > 0 && (
        <span className="block text-xs text-warning">
          {plural(alertedShifts, 'turno a revisar', 'turnos a revisar')}
        </span>
      )}
    </>
  );
}

const quiet = (value: number | null) => value === null && 'text-muted-foreground';

function CashierIndicators({ cashiers }: { cashiers: readonly CashierCashIndicators[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Indicadores por cajero</h3>

      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableCaption className="mb-3">
            Porcentajes sobre las ventas tickeadas; tickets por hora según el horario del turno.
          </TableCaption>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead scope="col">Cajero</TableHead>
              <TableHead scope="col" className="text-right">
                Ventas
              </TableHead>
              <TableHead scope="col" className="text-right">
                % efectivo
              </TableHead>
              <TableHead scope="col" className="text-right">
                % Club Grido
              </TableHead>
              <TableHead scope="col" className="text-right">
                Diferencia de caja
              </TableHead>
              <TableHead scope="col" className="text-right">
                Ticket promedio
              </TableHead>
              <TableHead scope="col" className="text-right">
                Tickets por hora
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashiers.map((cashier) => (
              <TableRow key={cashier.cashierKey} className="align-top">
                <TableCell className="whitespace-normal">
                  <span className="font-medium break-words">{cashier.cashierName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {plural(cashier.shiftCount, 'turno', 'turnos')}
                  </span>
                </TableCell>
                <TableCell className={numeric}>{formatMoney(cashier.venta)}</TableCell>
                <TableCell className={cn(numeric, quiet(cashier.cashShare))}>
                  {formatPercent(cashier.cashShare)}
                </TableCell>
                <TableCell className={cn(numeric, quiet(cashier.clubShare))}>
                  {formatPercent(cashier.clubShare)}
                </TableCell>
                <TableCell className={numeric}>
                  <DifferenceFigure cashier={cashier} />
                </TableCell>
                <TableCell className={cn(numeric, quiet(cashier.averageTicket))}>
                  {formatMoney(cashier.averageTicket)}
                </TableCell>
                <TableCell className={cn(numeric, quiet(cashier.ticketsPerHour))}>
                  {formatDecimal(cashier.ticketsPerHour)}
                  <span className="block text-xs text-muted-foreground">{slotRates(cashier)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Indicadores de caja por cajero" className="flex flex-col gap-3 md:hidden">
        {cashiers.map((cashier) => (
          <li
            key={cashier.cashierKey}
            className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="min-w-0 font-semibold break-words">{cashier.cashierName}</h4>
              <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                {formatMoney(cashier.venta)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {`Efectivo ${formatPercent(cashier.cashShare)} · Club Grido ${formatPercent(cashier.clubShare)}`}
            </p>
            <p className="text-sm tabular-nums">
              {'Diferencia '}
              <DifferenceFigure cashier={cashier} />
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {`Ticket promedio ${formatMoney(cashier.averageTicket)}`}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {`Tickets por hora ${formatDecimal(cashier.ticketsPerHour)} (${slotRates(cashier)})`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
