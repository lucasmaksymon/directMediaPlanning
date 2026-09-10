import { ERP_MONTHS, money } from "@/lib/erp";

export const ERP_ORDER_LEGAL = {
  startSubjectToMaterial:
    "La fecha de inicio está sujeta a la entrega del material de exhibición.",
  cuentaYOrden: (client: string) =>
    `Las compras realizadas por Next International Communication SRL son por cuenta y orden de ${client}.`,
  invoiceToNext: "Factura A a nombre de Next International Communication SRL.",
  ventaApproval:
    "LA APROBACIÓN DE ESTA ORDEN FUNCIONARÁ COMO ACEPTACIÓN DE LOS PUNTOS CONSIGNADOS EN LAS OBSERVACIONES",
  compraApproval: "LA ACEPTACIÓN DE ESTA ORDEN FUNCIONARÁ COMO APROBACIÓN DE LA SOLICITUD",
  produccionApproval: "LA RECEPCIÓN Y APROBACIÓN DE ESTA ORDEN CUMPLIMENTA LA ACEPTACIÓN DE LA SOLICITUD",
  photoCert:
    "CERTIFICACIÓN FOTOGRÁFICA: Del día 01 al día 07 del comienzo de la campaña se deberá recibir el registro fotográfico del 60% de las ubicaciones con su dirección exacta (en el nombre del archivo), que funcionará como certificación de que la campaña fue colocada y se encuentra en perfectas condiciones.",
  artes: "ARTES: Se entregará link con los originales.",
  colorProof: "PRUEBA COLOR DIGITAL, ENVIAR POR MAIL",
  footer:
    "NEXTMEDIA — Next International Communication SRL — Av. Alicia M. de Justo 1150 — 4º Piso Of. 410 B C.A.B.A. — Tel/Fax: (011) 4341-4515/16 — CUIT 30-71144767-5 — paula@nextmedia.com.ar",
} as const;

/** Cierre de la orden de compra: 1 resta del bruto, 2 lo suma. */
export const ERP_ADJUSTMENT = { deduct: 1, add: 2 } as const;

export const ERP_ADJUSTMENT_KINDS = [
  { value: String(ERP_ADJUSTMENT.deduct), label: "Resta" },
  { value: String(ERP_ADJUSTMENT.add), label: "Suma" },
] as const;

/** Conceptos habituales; la lista es abierta porque cada medio cierra distinto. */
export const ERP_ADJUSTMENT_LABELS = [
  "CONFIDENCIAL AGENCIA",
  "DESCUENTO ESPECIAL",
  "BONIFICACIÓN",
  "RECARGO",
] as const;

export type PurchaseAdjustment = {
  label: string;
  kind: number;
  percent?: number | null;
  amount: number;
};

/** El porcentaje manda; el importe es para los cierres pactados a monto fijo. */
export function adjustmentValue(gross: number, adj: PurchaseAdjustment) {
  if (adj.percent) return round2((gross * adj.percent) / 100);
  return adj.amount;
}

export const ERP_VAT_RATE = 21;

export function purchaseVat(net: number, vatRate: number) {
  return round2((net * vatRate) / 100);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function purchaseBreakdown(opts: {
  grossNet?: number | null;
  items?: { net: number }[];
  adjustments?: PurchaseAdjustment[];
}) {
  const lineTotal = (opts.items ?? []).reduce((a, i) => a + i.net, 0);
  const gross = opts.grossNet || lineTotal;
  const rows = (opts.adjustments ?? []).map((adj) => ({
    ...adj,
    value: adjustmentValue(gross, adj),
  }));
  const net = round2(
    rows.reduce(
      (total, row) => total + (row.kind === ERP_ADJUSTMENT.add ? row.value : -row.value),
      gross,
    ),
  );
  return { gross, rows, net };
}

/** "COSTO NETO TOTAL 6 DÍAS", o la leyenda libre que haya cargado el usuario. */
export function purchaseCostLabel(opts: { costLabel?: string | null; days?: number | null }) {
  if (opts.costLabel?.trim()) return opts.costLabel.trim().toUpperCase();
  if (opts.days) return `COSTO NETO TOTAL ${opts.days} DÍAS`;
  return "COSTO NETO TOTAL";
}

export function adjustmentLabel(adj: PurchaseAdjustment) {
  return adj.percent ? `${adj.label} ${formatPercent(adj.percent)}%` : adj.label;
}

function formatPercent(n: number) {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-AR");
}

export function longDate(d: Date | string | null | undefined) {
  if (d == null || d === "") return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function defaultSaleObservations(client: string) {
  return `${ERP_ORDER_LEGAL.startSubjectToMaterial}\n${ERP_ORDER_LEGAL.cuentaYOrden(client)}`;
}

export function defaultPurchaseObservations(client: string) {
  return `${ERP_ORDER_LEGAL.cuentaYOrden(client)}\n${ERP_ORDER_LEGAL.invoiceToNext}`;
}

export function defaultProductionObservations() {
  return `${ERP_ORDER_LEGAL.artes}\n${ERP_ORDER_LEGAL.colorProof}`;
}

export function salePeriodText(opts: {
  periodLabel?: string | null;
  month: number;
  year: number;
  items?: { startsAt?: Date | string | null; endsAt?: Date | string | null }[];
}) {
  if (opts.periodLabel?.trim()) return opts.periodLabel.trim();
  const dates = (opts.items ?? [])
    .flatMap((i) => [i.startsAt, i.endsAt])
    .filter((d): d is Date | string => d != null && d !== "");
  if (dates.length) {
    const times = dates.map((d) => new Date(d).getTime()).filter((t) => Number.isFinite(t));
    if (times.length) {
      const from = new Date(Math.min(...times)).toLocaleDateString("es-AR");
      const to = new Date(Math.max(...times)).toLocaleDateString("es-AR");
      return from === to ? from : `${from} al ${to}`;
    }
  }
  return `${ERP_MONTHS[opts.month]} ${opts.year}`;
}

export function saleBreakdown(items: {
  exhibitionNet: number;
  bonusNet: number;
  productionNet: number;
}[]) {
  const exhibition = items.reduce((a, i) => a + i.exhibitionNet, 0);
  const bonus = items.reduce((a, i) => a + i.bonusNet, 0);
  const production = items.reduce((a, i) => a + i.productionNet, 0);
  return {
    exhibition,
    bonus,
    production,
    subExhibition: exhibition - bonus,
    hasLines: exhibition !== 0 || bonus !== 0 || production !== 0,
  };
}

export function formatQty(n: number | null | undefined) {
  if (n == null || n === 0) return "—";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-AR");
}

export function formatMoneyOrDash(n: number | null | undefined) {
  if (n == null || n === 0) return "—";
  return money(n);
}
