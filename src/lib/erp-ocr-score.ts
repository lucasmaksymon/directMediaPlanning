/**
 * Puntajes del OCR para vincular comprobantes. Funciones puras: sin base ni red.
 * Regla general: un vínculo se elige solo si es claramente el mejor; si no, se pregunta.
 */

const MONTHS = [
  "",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Palabras de relleno en el detalle de una factura: no distinguen una orden de otra. */
const DETAIL_STOP = new Set([
  "de", "del", "la", "el", "los", "las", "y", "en", "por", "para", "con", "a", "al",
  "pauta", "via", "publica", "espectaculos", "espectaculo", "compras", "realizadas", "cuenta",
  "orden", "oc", "servicio", "servicios", "publicidad", "publicitario", "publicitaria",
  "mes", "campana", "segun", "factura", "sa", "srl", "sau", "s", "u",
]);

export const SURE_SCORE = 0.75;
export const SURE_MARGIN = 0.15;

export type ScoredOption = { id: string; label: string; score: number; reason?: string };

function fold(raw: string | null | undefined) {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function detailTokens(raw: string | null | undefined) {
  return [...new Set(fold(raw).split(" ").filter((t) => t.length > 2 && !DETAIL_STOP.has(t)))];
}

/** Elige solo si el mejor supera el mínimo y le saca margen al segundo. */
export function pickSure<T extends { score: number }>(sorted: T[], min = SURE_SCORE, margin = SURE_MARGIN): T | null {
  const [first, second] = sorted;
  if (!first || first.score < min) return null;
  if (second && first.score - second.score < margin) return null;
  return first;
}

/** Cuánto del detalle del PDF aparece en los textos de la orden (producto, elementos, número, mes). */
export function textScore(detail: string | null | undefined, haystack: Array<string | null | undefined>) {
  const query = detailTokens(detail);
  if (!query.length) return { score: 0, hits: [] as string[] };
  const words = new Set(haystack.flatMap((h) => fold(h).split(" ")).filter(Boolean));
  const hits = query.filter((t) => words.has(t));
  return { score: Math.min(1, hits.length / Math.min(query.length, 3)), hits };
}

/**
 * Qué tan bien entra un comprobante en una orden. Una factura parcial que cabe en el saldo
 * puntúa bien; igual al saldo o al total de la orden, muy bien; si se pasa del saldo, mal.
 */
export function fitScore(total: number | null | undefined, remaining: number, full: number) {
  if (total == null || total <= 0) return 0.3;
  if (Math.abs(total - remaining) <= 1 || Math.abs(total - full) <= 1) return 1;
  if (remaining > 0 && total <= remaining + 1) return 0.5;
  return 0;
}

/**
 * Fecha de la factura contra el período (mes/año) de la orden. Se suele facturar en el mismo
 * mes o en el siguiente; facturar antes del período es raro.
 */
export function periodScore(issuedAt: string | null | undefined, month: number, year: number) {
  if (!issuedAt) return 0.4;
  const [y, m] = issuedAt.split("-").map(Number);
  if (!y || !m) return 0.4;
  const lag = y * 12 + m - (year * 12 + month);
  if (lag === 0) return 1;
  if (lag === 1) return 0.9;
  if (lag === 2) return 0.5;
  if (lag === -1) return 0.4;
  if (lag === 3) return 0.2;
  return 0;
}

export function monthName(month: number) {
  return MONTHS[month] ?? "";
}

export type SaleOrderScoreInput = {
  sameClient: boolean;
  detail: string | null | undefined;
  total: number | null | undefined;
  issuedAt: string | null | undefined;
  order: {
    number: string;
    product: string | null;
    elements: string[];
    month: number;
    year: number;
    remaining: number;
    full: number;
  };
};

/** Puntaje de una O.P. de venta para una factura: cliente 0,4 · texto 0,25 · importe 0,2 · período 0,15. */
export function scoreSaleOrder(input: SaleOrderScoreInput) {
  const { order } = input;
  const text = textScore(input.detail, [order.product, order.number, monthName(order.month), ...order.elements]);
  const fit = fitScore(input.total, order.remaining, order.full);
  const period = periodScore(input.issuedAt, order.month, order.year);
  const score = (input.sameClient ? 0.4 : 0) + text.score * 0.25 + fit * 0.2 + period * 0.15;
  const reasons: string[] = [];
  if (input.sameClient) reasons.push("mismo cliente");
  if (text.hits.length) reasons.push(`el detalle menciona ${text.hits.join(", ").toUpperCase()}`);
  if (fit === 1) reasons.push("importe exacto");
  else if (fit >= 0.5) reasons.push("entra en el saldo");
  else if (fit === 0) reasons.push("supera el saldo");
  if (period === 1) reasons.push("mismo mes");
  else if (period >= 0.9) reasons.push("mes anterior");
  return { score: Math.round(score * 100) / 100, reason: reasons.join(" · ") };
}

/** Puntaje de una orden de compra/producción del proveedor: importe 0,6 · fecha 0,4. */
export function scoreSupplierOrder(fit: number, date: number) {
  const score = fit * 0.6 + date * 0.4;
  const reasons: string[] = [];
  if (fit === 1) reasons.push("importe exacto");
  else if (fit >= 0.5) reasons.push("entra en el saldo");
  else if (fit === 0) reasons.push("supera el saldo");
  if (date >= 0.8) reasons.push("fecha cercana");
  return { score: Math.round(score * 100) / 100, reason: reasons.join(" · ") };
}

const VAT_RATES = [21, 10.5, 27];

/** Dudas sobre los importes leídos: no bloquean, pero hay que confirmarlas. */
export function amountReview(e: {
  docType: string | null;
  amount: number | null;
  vat: number | null;
  total: number | null;
  extras?: number;
  confidence?: Record<string, number>;
}) {
  const out: string[] = [];
  const amount = e.amount ?? 0;
  const vat = e.vat ?? 0;
  if (e.total != null && amount > 0) {
    const sum = amount + vat + (e.extras ?? 0);
    if (Math.abs(sum - e.total) > 1) {
      out.push(`Neto + IVA (${fmt(sum)}) no da el total impreso (${fmt(e.total)}).`);
    }
  }
  if (amount > 0 && vat > 0) {
    const rate = (vat * 100) / amount;
    if (!VAT_RATES.some((r) => Math.abs(rate - r) <= 0.3)) {
      out.push(`El IVA es ${rate.toFixed(2)}% del neto: revisá neto e IVA.`);
    }
  }
  if (amount > 0 && vat === 0 && (e.docType ?? "").toUpperCase() === "A") out.push("Factura A sin IVA: revisá el IVA.");
  const conf = e.confidence ?? {};
  const low = [
    ["amount", "el importe"],
    ["number", "el número"],
    ["issuedAt", "la fecha"],
  ].filter(([key]) => conf[key] != null && conf[key] < 0.8);
  if (low.length) out.push(`El OCR no está seguro de ${low.map(([, label]) => label).join(", ")}.`);
  return out;
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** IVA sugerido para un neto, con la tasa de la orden o 21%. */
export function vatForNet(net: number, rate = 0.21) {
  return Math.round(net * rate * 100) / 100;
}
