import { formatArs } from "@/lib/format";

/** Estados de maestros (clientes, empresas, proveedores). */
export const ERP_RECORD = { inactive: 0, active: 1 } as const;

/** Órdenes: 0 borrador, 1 emitida, 4 facturada (cierra al completar importe). */
export const ERP_ORDER = { draft: 0, issued: 1, invoiced: 4 } as const;

/** Proveedor tipo=0 medio, tipo=1 productor. */
export const ERP_VENDOR = { media: 0, producer: 1 } as const;

/** Cobro de factura de venta (Excel: PENDIENTE / COBRADO). */
export const ERP_COLLECT = { pending: 0, collected: 1 } as const;

/** Pago de factura de compra (Excel: PENDIENTE / PAGADO). */
export const ERP_SETTLE = { pending: 0, paid: 1 } as const;

/** tipoPago de pagos de recibo de venta (ADMINISTRACION). */
export const ERP_PAY = {
  transfer: 0,
  cheque: 1,
  cash: 2,
  retVat: 3,
  retIibb: 4,
  retIibbAlt: 5,
  retGan: 6,
  retSuss: 7,
} as const;

/** tiposPagoVentas del legado. */
export const ERP_PAY_SALE = [
  "Transferencia",
  "Cheque",
  "Efectivo",
  "Retención IVA",
  "Retención IIBB",
  "Retención IIBB CABA",
  "Retención Ganancias",
  "Retención SUSS",
] as const;

/** ordenCheque: 0 sin dato. */
export const ERP_CHECK_ORDER = ["—", "Al día", "Diferido"] as const;

/** tipoCheque: 0 sin dato. */
export const ERP_CHECK_TYPE = ["—", "Físico", "E-cheq"] as const;

/** modoCheque: 0 sin dato. */
export const ERP_CHECK_MODE = ["—", "A la orden", "Cruzado"] as const;

/** estadoPagoVentas del legado. */
export const ERP_PAY_SALE_STATUS = ["Pendiente", "Cobrado", "Anulado"] as const;

/** Mismos códigos 0/1/2; en OP el 1 es pagado (sale sale como cobrado). */
export const ERP_PAY_PURCHASE_STATUS = ["Pendiente", "Pagado", "Anulado"] as const;

/** tipoPago de compra que lleva datos de cheque. */
export const ERP_PAY_PURCHASE_CHEQUE = [1, 2] as const;

export function erpPaySaleLabel(kind: number) {
  return ERP_PAY_SALE[kind] ?? `Pago ${kind}`;
}

export function erpCheckOrderLabel(v: number) {
  return ERP_CHECK_ORDER[v] ?? "—";
}

export function erpCheckTypeLabel(v: number) {
  return ERP_CHECK_TYPE[v] ?? "—";
}

export function erpCheckModeLabel(v: number) {
  return ERP_CHECK_MODE[v] ?? "—";
}

export function erpPaySaleStatusLabel(v: number) {
  return ERP_PAY_SALE_STATUS[v] ?? `Estado ${v}`;
}

export function selectOptions(labels: readonly string[]) {
  return labels.map((label, value) => ({ value: String(value), label }));
}

export const ERP_DOC_TYPES = ["A", "B", "C", "E", "NC"] as const;

export const ERP_PAY_METHODS = [
  { value: "ECHEQ BANCO PROVINCIA", label: "E-cheq Banco Provincia" },
  { value: "ECHEQ BANCO GALICIA", label: "E-cheq Banco Galicia" },
  { value: "TRANSFERENCIA BANCO PROVINCIA", label: "Transferencia Banco Provincia" },
  { value: "TRANSFERENCIA BANCO GALICIA", label: "Transferencia Banco Galicia" },
] as const;

export function erpReceiptRef(number: number) {
  return `X ${String(number).padStart(8, "0")}`;
}

export const ERP_MONTHS = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const ERP_TAX_CONDITION = [
  "IVA Responsable Inscripto",
  "Monotributo",
  "IVA Exento",
  "Consumidor Final",
] as const;

export function erpRecordLabel(estado: number) {
  return estado === ERP_RECORD.active ? "Activo" : "Inactivo";
}

export function erpOrderLabel(estado: number) {
  if (estado === ERP_ORDER.invoiced) return "Facturada";
  if (estado === ERP_ORDER.issued) return "Emitida";
  if (estado === ERP_ORDER.draft) return "Borrador";
  return `Estado ${estado}`;
}

export function erpSettlementLabel(cashPayment: boolean) {
  return cashPayment ? "Pago efectivo" : "Con factura";
}

export function erpOrderBadge(estado: number): "success" | "warning" | "default" | "info" {
  if (estado === ERP_ORDER.invoiced) return "success";
  if (estado === ERP_ORDER.issued) return "info";
  if (estado === ERP_ORDER.draft) return "warning";
  return "default";
}

export function erpVendorKindLabel(kind: number) {
  return kind === ERP_VENDOR.producer ? "Productor" : "Medio";
}

export function erpCollectLabel(status: number) {
  return status === ERP_COLLECT.collected ? "Cobrado" : "Pendiente";
}

export function erpSettleLabel(status: number) {
  return status === ERP_SETTLE.paid ? "Pagado" : "Pendiente";
}

export function erpSaleRowStatus(hasInvoice: boolean, collectStatus: number | null) {
  if (!hasInvoice) return "A facturar";
  return collectStatus === ERP_COLLECT.collected ? "Cobrado" : "Pendiente";
}

export function erpSaleRowBadge(
  hasInvoice: boolean,
  collectStatus: number | null,
): "warning" | "success" | "info" {
  if (!hasInvoice) return "warning";
  return collectStatus === ERP_COLLECT.collected ? "success" : "info";
}

/** Acepta 1.234,56 / 1234,56 / 1234.56 / $ 1.234,56. Nunca devuelve NaN. */
export function parseMoney(raw: FormDataEntryValue | string | null | undefined): number {
  if (typeof File !== "undefined" && raw instanceof File) return 0;
  let s = String(raw ?? "").trim().replace(/\s/g, "");
  if (!s || s === "—" || s === "-") return 0;
  s = s.replace(/[^\d,.-]/g, "");
  if (!s || s === "-" || s === "," || s === ".") return 0;
  let n: number;
  const dots = s.match(/\./g)?.length ?? 0;
  if (s.includes(",") && s.includes(".")) {
    n = Number(s.replace(/\./g, "").replace(",", "."));
  } else if (s.includes(",")) {
    n = Number(s.replace(",", "."));
  } else if (dots > 1) {
    n = Number(s.replace(/\./g, ""));
  } else {
    n = Number(s);
  }
  return Number.isFinite(n) ? n : 0;
}

export function parseIntField(raw: FormDataEntryValue | string | null | undefined, fallback = 0) {
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function parseDateField(raw: FormDataEntryValue | string | null | undefined): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function requiredString(raw: FormDataEntryValue | string | null | undefined, label: string) {
  const s = String(raw ?? "").trim();
  if (!s) throw new Error(`Completá ${label}.`);
  return s;
}

export function optionalString(raw: FormDataEntryValue | string | null | undefined) {
  const s = String(raw ?? "").trim();
  return s || null;
}

export function parseOptionalInt(raw: FormDataEntryValue | string | null | undefined) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function parseOptionalMoney(raw: FormDataEntryValue | string | null | undefined) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return parseMoney(s);
}

export function money(n: number | { toString(): string } | null | undefined) {
  return formatArs(n ?? 0);
}

export function erpInputNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? String(n) : "0";
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function isoDateOrEmpty(d: Date | string | null | undefined) {
  if (d == null || d === "") return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1901) return "";
  return isoDate(date);
}

export function displayDate(d: Date | string | null | undefined) {
  if (d == null || d === "") return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR");
}

export function shouldCloseOrder(invoicedTotal: number, orderAmount: number) {
  return invoicedTotal >= orderAmount - 0.009;
}

/** Si cubre el importe → 4; si no, vuelve a emitida (salvo que siga en borrador). */
export function nextAutoOrderEstado(
  invoicedTotal: number,
  orderAmount: number,
  currentEstado: number,
) {
  if (shouldCloseOrder(invoicedTotal, orderAmount)) return ERP_ORDER.invoiced;
  if (currentEstado === ERP_ORDER.draft) return ERP_ORDER.draft;
  return ERP_ORDER.issued;
}

export const ERP_ISSUER = {
  legalName: "NEXT INTERNATIONAL COMMUNICATION S.R.L.",
  address: "Alicia M. de Justo 1150 4º piso of. 410 B | C.A.B.A.",
  phone: "Tel. / Fax: (54 11) 4341-4515 / 4516",
  email: "paula@nextmedia.com.ar",
  tax: "Resp. Inscrip. | C.U.I.T.: 30-71144767-5",
} as const;

/** tiposPagoCompra del legado: 0 transferencia, 1 cheque, 2 endoso, 4 saldo de OP. */
export const ERP_PAY_PURCHASE = [
  "Transferencia",
  "Cheque",
  "Cheque endosado",
  "Retención IVA",
  "Saldo orden",
  "Retención IIBB",
  "Retención Ganancias",
  "Retención SUSS",
] as const;

export function erpPayPurchaseLabel(kind: number) {
  return ERP_PAY_PURCHASE[kind] ?? `Pago ${kind}`;
}

/** ADMINISTRACION imprimía el id de la OP, no el campo numero. */
export function erpPaymentOrderNumber(id: string, number: number) {
  const legacy = /^adm-opo-(\d+)$/.exec(id);
  if (legacy) return legacy[1].padStart(8, "0");
  return String(number).padStart(8, "0");
}

/** Comprobante como en el PDF viejo: A-0001-0001 */
export function erpPurchaseDocRefOld(docType: string, pos: number, number: number) {
  return `${docType}-${String(pos).padStart(4, "0")}-${String(number).padStart(4, "0")}`;
}

export function erpPurchaseInvoiceTotal(inv: {
  amount: number | { toString(): string };
  vat: number | { toString(): string };
  vatWithholding?: number | { toString(): string } | null;
  iibbCaba?: number | { toString(): string } | null;
  iibbBsAs?: number | { toString(): string } | null;
  internalTax?: number | { toString(): string } | null;
  nonTaxable?: number | { toString(): string } | null;
}) {
  const n = (v: number | { toString(): string } | null | undefined) => Number(v ?? 0);
  return (
    n(inv.amount) +
    n(inv.vat) +
    n(inv.vatWithholding) +
    n(inv.iibbCaba) +
    n(inv.iibbBsAs) +
    n(inv.internalTax) +
    n(inv.nonTaxable)
  );
}
