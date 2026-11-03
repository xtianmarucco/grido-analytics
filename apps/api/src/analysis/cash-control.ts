import {
  type CashControl,
  type CashDifferenceTotals,
  CashDifferenceKind,
  type CashierCashIndicators,
  type CashierSlotStats,
  type CashSummary,
  type LowCashSignal,
  type NormalizedShift,
  type ShiftAlert,
  ShiftSlot,
  type SlotStats,
} from '@grido/shared';

/** Shift alert threshold: |turdiferencia| ≥ 1 % of turefectivo (inclusive). */
export const CASH_ALERT_PERCENT = 1;

/** Low-cash signal threshold: cashier share ≥ 10 points below the slot peers (inclusive). */
export const LOW_CASH_GAP_POINTS = 10;

export const SLOT_LABELS: Record<ShiftSlot, string> = {
  [ShiftSlot.Day]: 'Día',
  [ShiftSlot.Night]: 'Noche',
};

const SLOT_ORDER: readonly ShiftSlot[] = [ShiftSlot.Day, ShiftSlot.Night];

const signedMoney = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  signDisplay: 'exceptZero',
});
const decimal = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percent = (value: number) => `${decimal.format(value)} %`;

/** Money values are already rounded to cents by the import; this only drops float noise. */
const cents = (value: number) => Math.round(value * 100);
const pesos = (value: number) => (value === 0 ? 0 : value / 100);

const SECONDS_PER_HOUR = 3600;

/** Seconds between two wall-clock strings, read as the same (UTC) clock: no timezone applies. */
function shiftSeconds(s: NormalizedShift): number {
  return (Date.parse(`${s.closedAt}Z`) - Date.parse(`${s.startedAt}Z`)) / 1000;
}

/**
 * `true` when |difference| ≥ 1 % of the cash on integer cents, or when the shift had no cash
 * and a non-zero difference.
 */
export function isAlertedShift(s: NormalizedShift): boolean {
  const difference = Math.abs(cents(s.turDiferencia));
  const cash = cents(s.turEfectivo);
  if (difference === 0) return false;
  if (cash === 0) return true;
  return difference * (100 / CASH_ALERT_PERCENT) >= cash;
}

/** Integer-cent sums of a set of shifts. */
interface Totals {
  shiftCount: number;
  tickets: number;
  venta: number;
  turEfectivo: number;
  ventaClubGrido: number;
  net: number;
  faltante: number;
  sobrante: number;
  shiftsWithDifference: number;
  alertedShifts: number;
  seconds: number;
}

function sumShifts(shifts: readonly NormalizedShift[]): Totals {
  const totals: Totals = {
    shiftCount: 0,
    tickets: 0,
    venta: 0,
    turEfectivo: 0,
    ventaClubGrido: 0,
    net: 0,
    faltante: 0,
    sobrante: 0,
    shiftsWithDifference: 0,
    alertedShifts: 0,
    seconds: 0,
  };
  for (const s of shifts) {
    const difference = cents(s.turDiferencia);
    totals.shiftCount += 1;
    totals.tickets += s.tickets;
    totals.venta += cents(s.venta);
    totals.turEfectivo += cents(s.turEfectivo);
    totals.ventaClubGrido += cents(s.ventaClubGrido);
    totals.net += difference;
    if (difference < 0) totals.faltante += difference;
    if (difference > 0) totals.sobrante += difference;
    if (difference !== 0) totals.shiftsWithDifference += 1;
    if (isAlertedShift(s)) totals.alertedShifts += 1;
    totals.seconds += shiftSeconds(s);
  }
  return totals;
}

const share = (part: number, whole: number) => (whole === 0 ? null : (part / whole) * 100);
const perHour = (tickets: number, seconds: number) =>
  seconds === 0 ? null : tickets / (seconds / SECONDS_PER_HOUR);

function differenceTotals(t: Totals): CashDifferenceTotals {
  return {
    net: pesos(t.net),
    faltante: pesos(t.faltante),
    sobrante: pesos(t.sobrante),
    shiftsWithDifference: t.shiftsWithDifference,
    alertedShifts: t.alertedShifts,
  };
}

function indicators(shifts: readonly NormalizedShift[]): CashSummary {
  const t = sumShifts(shifts);
  return {
    shiftCount: t.shiftCount,
    tickets: t.tickets,
    venta: pesos(t.venta),
    turEfectivo: pesos(t.turEfectivo),
    ventaClubGrido: pesos(t.ventaClubGrido),
    cashShare: share(t.turEfectivo, t.venta),
    clubShare: share(t.ventaClubGrido, t.venta),
    difference: differenceTotals(t),
    averageTicket: t.tickets === 0 ? null : t.venta / 100 / t.tickets,
    hours: t.seconds / SECONDS_PER_HOUR,
    ticketsPerHour: perHour(t.tickets, t.seconds),
  };
}

function groupBy<K>(shifts: readonly NormalizedShift[], key: (s: NormalizedShift) => K) {
  const groups = new Map<K, NormalizedShift[]>();
  for (const s of shifts) {
    const k = key(s);
    const group = groups.get(k);
    if (group) group.push(s);
    else groups.set(k, [s]);
  }
  return groups;
}

function slotsOf(shifts: readonly NormalizedShift[]): ShiftSlot[] {
  return SLOT_ORDER.filter((slot) => shifts.some((s) => s.slot === slot));
}

function cashierSlots(shifts: readonly NormalizedShift[]): CashierSlotStats[] {
  return slotsOf(shifts).map((slot) => {
    const t = sumShifts(shifts.filter((s) => s.slot === slot));
    return {
      slot,
      shiftCount: t.shiftCount,
      tickets: t.tickets,
      hours: t.seconds / SECONDS_PER_HOUR,
      ticketsPerHour: perHour(t.tickets, t.seconds),
    };
  });
}

function cashierIndicators(shifts: readonly NormalizedShift[]): CashierCashIndicators[] {
  return [...groupBy(shifts, (s) => s.cashierKey)]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cashierKey, own]) => ({
      cashierKey,
      cashierName: own[0]?.cashierName ?? cashierKey,
      branchCodes: [...new Set(own.map((s) => s.branchCode))].sort((a, b) => a - b),
      ...indicators(own),
      slots: cashierSlots(own),
    }));
}

function slotStats(shifts: readonly NormalizedShift[]): SlotStats[] {
  return slotsOf(shifts).map((slot) => {
    const t = sumShifts(shifts.filter((s) => s.slot === slot));
    return {
      slot,
      shiftCount: t.shiftCount,
      tickets: t.tickets,
      venta: pesos(t.venta),
      turEfectivo: pesos(t.turEfectivo),
      cashShare: share(t.turEfectivo, t.venta),
      hours: t.seconds / SECONDS_PER_HOUR,
      ticketsPerHour: perHour(t.tickets, t.seconds),
    };
  });
}

function shiftAlerts(shifts: readonly NormalizedShift[]): ShiftAlert[] {
  return shifts
    .filter(isAlertedShift)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.turno - b.turno)
    .map((s) => {
      const cash = cents(s.turEfectivo);
      const percentOfCash = cash === 0 ? null : (Math.abs(cents(s.turDiferencia)) / cash) * 100;
      const amount = signedMoney.format(s.turDiferencia);
      const fact =
        percentOfCash === null
          ? `La diferencia de caja del turno fue ${amount} en un turno sin ventas en efectivo.`
          : `La diferencia de caja del turno fue ${amount} (${percent(percentOfCash)} del efectivo).`;
      return {
        turno: s.turno,
        branchCode: s.branchCode,
        branchName: s.branchName,
        cashierKey: s.cashierKey,
        cashierName: s.cashierName,
        startedAt: s.startedAt,
        slot: s.slot,
        difference: s.turDiferencia,
        turEfectivo: s.turEfectivo,
        percentOfCash,
        kind: s.turDiferencia < 0 ? CashDifferenceKind.Faltante : CashDifferenceKind.Sobrante,
        message: `${fact} Conviene revisar el arqueo de ese turno.`,
      };
    });
}

/**
 * peers% − cashier% ≥ 10 points, exactly: Ep/Vp − Ec/Vc ≥ 1/10 ⇔ 10·(Ep·Vc − Ec·Vp) ≥ Vp·Vc on
 * cents. BigInt because the cent products exceed `Number.MAX_SAFE_INTEGER`.
 */
function isLowCash(cashier: Totals, peers: Totals): boolean {
  const ec = BigInt(cashier.turEfectivo);
  const vc = BigInt(cashier.venta);
  const ep = BigInt(peers.turEfectivo);
  const vp = BigInt(peers.venta);
  return BigInt(100 / LOW_CASH_GAP_POINTS) * (ep * vc - ec * vp) >= vp * vc;
}

function lowCashSignals(shifts: readonly NormalizedShift[]): LowCashSignal[] {
  const signals: LowCashSignal[] = [];
  const branches = [...groupBy(shifts, (s) => s.branchCode)].sort(([a], [b]) => a - b);
  for (const [branchCode, branchShifts] of branches) {
    for (const slot of slotsOf(branchShifts)) {
      const slotShifts = branchShifts.filter((s) => s.slot === slot);
      const found: LowCashSignal[] = [];
      for (const [cashierKey, own] of groupBy(slotShifts, (s) => s.cashierKey)) {
        const peerShifts = slotShifts.filter((s) => s.cashierKey !== cashierKey);
        const cashier = sumShifts(own);
        const peers = sumShifts(peerShifts);
        if (cashier.venta === 0 || peers.venta === 0 || !isLowCash(cashier, peers)) continue;
        const cashierShare = (cashier.turEfectivo / cashier.venta) * 100;
        const peersShare = (peers.turEfectivo / peers.venta) * 100;
        const branchName = own[0]?.branchName ?? `Sucursal ${branchCode}`;
        const cashierName = own[0]?.cashierName ?? cashierKey;
        const shiftsText = `${own.length} ${own.length === 1 ? 'turno' : 'turnos'}`;
        found.push({
          branchCode,
          branchName,
          slot,
          cashierKey,
          cashierName,
          shiftCount: own.length,
          shifts: own
            .map((s) => ({ turno: s.turno, startedAt: s.startedAt }))
            .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.turno - b.turno),
          cashierShare,
          peersShare,
          gapPoints: peersShare - cashierShare,
          message:
            `En ${branchName} (${SLOT_LABELS[slot]}), ${cashierName} cobró en efectivo el ` +
            `${percent(cashierShare)} de sus ventas (${shiftsText}); el resto de los cajeros de ` +
            `ese horario, el ${percent(peersShare)} (${decimal.format(peersShare - cashierShare)} ` +
            `puntos más). Conviene revisar cómo se registraron los cobros de esos turnos.`,
        });
      }
      found.sort(
        (a, b) =>
          b.gapPoints - a.gapPoints ||
          (a.cashierKey < b.cashierKey ? -1 : a.cashierKey > b.cashierKey ? 1 : 0),
      );
      signals.push(...found);
    }
  }
  return signals;
}

/**
 * Cash control of a view (pure, docs/BUSINESS_RULES.md): indicators on sums, never averaged
 * percentages; shift alerts at 1 % of the cash; low-cash signals within branch + slot only.
 */
export function buildCashControl(shifts: readonly NormalizedShift[]): CashControl {
  return {
    summary: indicators(shifts),
    cashiers: cashierIndicators(shifts),
    slots: slotStats(shifts),
    shiftAlerts: shiftAlerts(shifts),
    lowCashSignals: lowCashSignals(shifts),
  };
}
