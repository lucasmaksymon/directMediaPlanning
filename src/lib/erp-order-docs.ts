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
