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

/** tipoPago=1 es cheque (recibidos = recibo venta, emitidos = recibo compra). */
export const ERP_PAY = {
  cheque: 1,
  transfer: 2,
  retVat: 3,
  retIibb: 4,
  retIibbAlt: 5,
  retGan: 6,
  retSuss: 7,
} as const;

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

/** Acepta 1.234,56 / 1234,56 / 1234.56 */
export function parseMoney(raw: FormDataEntryValue | string | null | undefined): number {
  const s = String(raw ?? "").trim().replace(/\s/g, "");
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  if (s.includes(",")) return Number(s.replace(",", "."));
  const n = Number(s);
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
