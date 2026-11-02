import type { ImportResult } from '@grido/shared';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatDate, formatWallClock } from '@/lib/format';
import { WarningList } from './WarningList';

const numeric = 'text-right tabular-nums';

/** Presentational: import summary, warnings and the normalized shifts as returned by the API. */
export function ImportPreview({ result }: { result: ImportResult }) {
  const { period, branches, shifts, warnings, summary } = result;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Período</dt>
        <dd className="font-medium">{`${formatDate(period.from)} al ${formatDate(period.to)}`}</dd>
        <dt className="text-muted-foreground">Sucursales</dt>
        <dd className="font-medium">
          {branches.map((branch) => `${branch.name} (${branch.shiftCount})`).join(', ')}
        </dd>
        <dt className="text-muted-foreground">Filas incluidas</dt>
        <dd className="font-medium">{`${summary.includedRows} de ${summary.totalRows}`}</dd>
      </dl>

      <WarningList warnings={warnings} />

      <Table>
        <TableCaption>Vista previa de los turnos normalizados.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Sucursal</TableHead>
            <TableHead className="text-right">Turno</TableHead>
            <TableHead>Cajero</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead className="text-right">Tickets</TableHead>
            <TableHead className="text-right">Activadas</TableHead>
            <TableHead className="text-right">Aceptadas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.turno}>
              <TableCell>{shift.branchName}</TableCell>
              <TableCell className={numeric}>{shift.turno}</TableCell>
              <TableCell>{shift.cashierName}</TableCell>
              <TableCell className="tabular-nums">{formatWallClock(shift.startedAt)}</TableCell>
              <TableCell className={numeric}>{shift.tickets}</TableCell>
              <TableCell className={numeric}>{shift.activadas}</TableCell>
              <TableCell className={numeric}>{shift.aceptadas}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
