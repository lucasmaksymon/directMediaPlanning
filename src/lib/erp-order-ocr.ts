import { parseMoney } from "@/lib/erp";
import { ERP_ADJUSTMENT, ERP_VAT_RATE, inferVatRate, purchaseBreakdown } from "@/lib/erp-order-docs";

// El parser corre también en el navegador (borradores), por eso no reutiliza los helpers de erp-ocr.

export const ORDER_OCR_KINDS = ["sale_order", "purchase_order", "production_order"] as const;
export type OrderOcrKind = (typeof ORDER_OCR_KINDS)[number];

export const ORDER_OCR_KIND_LABEL: Record<OrderOcrKind, string> = {
  sale_order: "O.P. de venta",
  purchase_order: "O.P. de compra",
  production_order: "orden de producción",
};

export type OrderOcrSaleItem = {
  element: string;
  location: string | null;
  plaza: string | null;
  quantity: number;
  faces: number;
  days: number | null;
  measures: string | null;
  unitCost: number;
  exhibitionNet: number;
  bonusNet: number;
  productionNet: number;
  startsAt: string | null;
  endsAt: string | null;
};

export type OrderOcrPurchaseItem = {
  element: string;
  location: string | null;
  quantity: number;
  days: number | null;
  measures: string | null;
  unitCost: number;
  net: number;
};

export type OrderOcrAdjustment = {
  label: string;
  kind: number;
  percent: number | null;
  amount: number;
};

export type OrderOcrProductionItem = {
  element: string;
  location: string | null;
  quantity: number;
  measures: string | null;
  printSupport: string | null;
  net: number;
};

export type OrderOcrDelivery = { destination: string; quantity: number };

export type OrderOcrExtracted = {
  kind: OrderOcrKind;
  detectedKind: OrderOcrKind | null;
  number: string | null;
  parentNumber: string | null;
  issuedAt: string | null;
  client: string | null;
  vendor: string | null;
  vendorTaxId: string | null;
  product: string | null;
  campaign: string | null;
  plaza: string | null;
  periodLabel: string | null;
  month: number | null;
  year: number | null;
  startsAt: string | null;
  endsAt: string | null;
  days: number | null;
  media: string | null;
  measures: string | null;
  support: string | null;
  circuit: string | null;
  spotCount: number | null;
  unitCost: number | null;
  costLabel: string | null;
  locations: string | null;
  printShop: string | null;
  printSupport: string | null;
  quantity: number | null;
  motifs: string | null;
  invoiceDetail: string | null;
  colorProof: string | null;
  pickup: string | null;
  agencyFee: number | null;
  grossNet: number | null;
  net: number | null;
  vatRate: number;
  vat: number | null;
  total: number | null;
  observations: string | null;
  saleItems: OrderOcrSaleItem[];
  purchaseItems: OrderOcrPurchaseItem[];
  adjustments: OrderOcrAdjustment[];
  productionItems: OrderOcrProductionItem[];
  deliveries: OrderOcrDelivery[];
  warnings: string[];
};

export type OrderOcrPick = { id: string; label: string };

export type OrderOcrMatchResult = {
  extracted: OrderOcrExtracted;
  attachmentUrl: string | null;
  client: OrderOcrPick | null;
  vendor: OrderOcrPick | null;
  saleOrder: OrderOcrPick | null;
  duplicate: OrderOcrPick | null;
  blockers: string[];
};

type Row = Record<string, unknown>;

function asRow(raw: unknown): Row {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Row) : {};
}

function text(value: unknown): string | null {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s && s !== "-" && s.toLowerCase() !== "null" ? s : null;
}

function longText(value: unknown): string | null {
  const s = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return s || null;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value);
  if (!/\d/.test(s)) return null;
  return parseMoney(s.replace(/\(([^)]*)\)/, "$1"));
}

function int(value: unknown): number | null {
  const n = num(value);
  return n == null ? null : Math.trunc(n);
}

function dateText(value: unknown): string | null {
  const s = text(value);
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(s);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return null;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const NUMBER_RE = /(\d{2}\.\d{4}\.\d{4}(?:\.\d{4}(?:-\d+)?)?)\s*([CMP])?\b/i;

/** "NRO 10.2026.0057.0007-1 M" → "10.2026.0057.0007-1 M". */
export function normalizeOrderNumber(raw: unknown): string | null {
  const s = text(raw)?.toUpperCase();
  if (!s) return null;
  const m = NUMBER_RE.exec(s);
  if (!m) return s.replace(/^(NRO|N[º°]|NUMERO|NÚMERO)[:.\s]*/i, "").trim() || null;
  return m[2] ? `${m[1]} ${m[2].toUpperCase()}` : m[1];
}

export function orderKindFromNumber(number: string | null | undefined): OrderOcrKind | null {
  const m = NUMBER_RE.exec(String(number ?? "").toUpperCase());
  if (!m) return null;
  if (m[2] === "C") return "sale_order";
  if (m[2] === "M") return "purchase_order";
  if (m[2] === "P") return "production_order";
  return m[1].split(".").length === 3 ? "sale_order" : null;
}

/** Las compras y producciones cuelgan de la venta por prefijo: 10.2026.0057.0005 M → 10.2026.0057 C. */
export function parentSaleNumber(number: string | null | undefined): string | null {
  const m = /^(\d{2}\.\d{4}\.\d{4})\.\d{4}/.exec(String(number ?? "").trim());
  return m ? `${m[1]} C` : null;
}

export function orderNumberRoot(number: string | null | undefined) {
  return String(number ?? "")
    .toUpperCase()
    .replace(/\s+[CMP]$/, "")
    .trim();
}

function detectedKind(row: Row, number: string | null): OrderOcrKind | null {
  const fromNumber = orderKindFromNumber(number);
  if (fromNumber) return fromNumber;
  const title = String(row.documentTitle ?? row.docKind ?? "").toUpperCase();
  if (title.includes("PRODUCC")) return "production_order";
  if (title.includes("PUBLICIDAD")) return "purchase_order";
  if (title.includes("COMPRA") || title.includes("VENTA")) return "sale_order";
  return null;
}

/** Los cierres de los medios casi siempre restan, aunque el PDF muestre el importe sin signo. */
function adjustmentKind(raw: unknown, label: string) {
  const s = String(raw ?? "").toLowerCase();
  if (s === "add" || s === "suma" || s === "2" || label.includes("RECARGO")) return ERP_ADJUSTMENT.add;
  return ERP_ADJUSTMENT.deduct;
}

function list(raw: unknown): Row[] {
  return Array.isArray(raw) ? raw.map(asRow) : [];
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function monthNumber(value: unknown): number | null {
  const n = int(value);
  if (n != null && n >= 1 && n <= 12) return n;
  const s = String(value ?? "").toLowerCase().replace("setiembre", "septiembre");
  const index = MONTHS.findIndex((m) => s.includes(m));
  return index >= 0 ? index + 1 : null;
}

const NEXTMEDIA_CUIT = "30711447675";

function vendorTaxId(value: unknown) {
  const s = text(value);
  return s && s.replace(/\D/g, "") !== NEXTMEDIA_CUIT ? s : null;
}

function element(row: Row) {
  return text(row.element ?? row.formato ?? row.format ?? row.dispositivo ?? row.product ?? row.producto) ?? "";
}

function saleItems(raw: unknown): OrderOcrSaleItem[] {
  return list(raw)
    .map((row) => ({
      element: element(row),
      location: text(row.location ?? row.ubicacion),
      plaza: text(row.plaza ?? row.zona),
      quantity: num(row.quantity ?? row.ubicaciones) ?? 0,
      faces: num(row.faces ?? row.caras) ?? 0,
      days: int(row.days ?? row.dias),
      measures: text(row.measures ?? row.medidas),
      unitCost: num(row.unitCost) ?? 0,
      exhibitionNet: num(row.exhibitionNet) ?? 0,
      bonusNet: num(row.bonusNet) ?? 0,
      productionNet: num(row.productionNet) ?? 0,
      startsAt: dateText(row.startsAt),
      endsAt: dateText(row.endsAt),
    }))
    .filter((item) => item.element || item.location || item.exhibitionNet);
}

function purchaseItems(raw: unknown): OrderOcrPurchaseItem[] {
  return list(raw)
    .map((row) => ({
      element: element(row),
      location: text(row.location ?? row.ubicacion),
      quantity: num(row.quantity) ?? 0,
      days: int(row.days),
      measures: text(row.measures),
      unitCost: num(row.unitCost) ?? 0,
      net: num(row.net ?? row.netCost) ?? 0,
    }))
    .filter((item) => item.element);
}

function adjustments(raw: unknown): OrderOcrAdjustment[] {
  return list(raw)
    .map((row) => {
      const label = (text(row.label ?? row.concept ?? row.concepto ?? row.name) ?? "")
        .toUpperCase()
        .replace(/\s*\d+([.,]\d+)?\s*%\s*$/, "");
      return {
        label,
        kind: adjustmentKind(row.kind, label),
        percent: num(row.percent),
        amount: Math.abs(num(row.amount) ?? 0),
      };
    })
    .filter((adj) => adj.label);
}

function productionItems(raw: unknown): OrderOcrProductionItem[] {
  return list(raw)
    .map((row) => ({
      element: element(row),
      location: text(row.location),
      quantity: num(row.quantity) ?? 0,
      measures: text(row.measures),
      printSupport: text(row.printSupport),
      net: num(row.net ?? row.netCost) ?? 0,
    }))
    .filter((item) => item.element);
}

function deliveries(raw: unknown): OrderOcrDelivery[] {
  return list(raw)
    .map((row) => ({ destination: text(row.destination) ?? "", quantity: num(row.quantity) ?? 0 }))
    .filter((row) => row.destination);
}

export function parseOrderOcr(raw: unknown, kind: OrderOcrKind): OrderOcrExtracted {
  const row = asRow(raw);
  const number = normalizeOrderNumber(row.number);
  const issuedAt = dateText(row.issuedAt);
  const startsAt = dateText(row.startsAt);
  const extracted: OrderOcrExtracted = {
    kind,
    detectedKind: detectedKind(row, number),
    number,
    parentNumber: parentSaleNumber(number),
    issuedAt,
    client: text(row.client),
    vendor: text(row.vendor),
    vendorTaxId: vendorTaxId(row.vendorTaxId),
    product: text(row.product),
    campaign: text(row.campaign),
    plaza: text(row.plaza),
    periodLabel: text(row.periodLabel),
    month: monthNumber(row.month),
    year: int(row.year),
    startsAt,
    endsAt: dateText(row.endsAt),
    days: int(row.days),
    media: text(row.media),
    measures: text(row.measures),
    support: text(row.support),
    circuit: text(row.circuit),
    spotCount: int(row.spotCount),
    unitCost: num(row.unitCost),
    costLabel: text(row.costLabel),
    locations: longText(row.locations),
    printShop: text(row.printShop),
    printSupport: text(row.printSupport),
    quantity: num(row.quantity),
    motifs: text(row.motifs),
    invoiceDetail: text(row.invoiceDetail),
    colorProof: text(row.colorProof),
    pickup: text(row.pickup),
    agencyFee: num(row.agencyFee),
    grossNet: num(row.grossNet),
    net: num(row.net),
    vatRate: num(row.vatRate) ?? ERP_VAT_RATE,
    vat: num(row.vat),
    total: num(row.total),
    observations: longText(row.observations),
    saleItems: saleItems(row.saleItems),
    purchaseItems: purchaseItems(row.purchaseItems),
    adjustments: adjustments(row.adjustments),
    productionItems: productionItems(row.productionItems),
    deliveries: deliveries(row.deliveries),
    warnings: Array.isArray(row.warnings) ? row.warnings.map((w) => String(w)).filter(Boolean) : [],
  };
  return withDerivedAmounts(extracted);
}

function withDerivedAmounts(e: OrderOcrExtracted): OrderOcrExtracted {
  const warnings = [...e.warnings];
  const next = { ...e };
  const periodDate = next.startsAt ?? next.issuedAt;
  if (periodDate) {
    next.month ??= Number(periodDate.slice(5, 7));
    next.year ??= Number(periodDate.slice(0, 4));
  }

  if (next.kind === "purchase_order") {
    const lineTotal = round2(next.purchaseItems.reduce((a, i) => a + i.net, 0));
    if (!next.grossNet && !lineTotal && !next.adjustments.length && next.net) next.grossNet = next.net;
    if (next.grossNet && lineTotal && Math.abs(lineTotal - next.grossNet) > 1.5) {
      warnings.push(`El detalle suma ${lineTotal} y el costo antes de ajustes es ${next.grossNet}. Revisá las líneas.`);
    }
    const { gross, net } = purchaseBreakdown({
      grossNet: next.grossNet,
      items: next.purchaseItems,
      adjustments: next.adjustments,
    });
    next.grossNet = gross;
    if (next.net != null && Math.abs(net - next.net) > 1.5) {
      warnings.push(`El neto calculado (${net}) no coincide con el de la orden (${next.net}). Revisá los ajustes.`);
    }
    next.net = net;
  } else {
    if (next.net == null && next.total != null) next.net = round2(next.total - (next.vat ?? 0));
    if (next.net == null && next.kind === "production_order") {
      const lines = next.productionItems.reduce((a, i) => a + i.net, 0);
      if (lines) next.net = lines;
    }
    if (next.net != null && next.vat != null && next.net > 0) {
      next.vatRate = inferVatRate(next.net, next.vat);
    } else if (next.net != null && next.vat == null) {
      next.vat = round2((next.net * next.vatRate) / 100);
    }
  }

  const total = round2((next.net ?? 0) + (next.vat ?? round2(((next.net ?? 0) * next.vatRate) / 100)));
  if (next.total != null && next.net != null && Math.abs(total - next.total) > 1.5) {
    warnings.push(`El total de la orden (${next.total}) no cierra con neto + IVA (${total}).`);
  }
  const missingElement = next.saleItems.filter((item) => !item.element).length;
  if (missingElement) {
    warnings.push(`${missingElement} ítem(s) sin elemento: completalo antes de guardar o la línea se descarta.`);
  }
  if (!next.number) warnings.push("No se leyó el número de orden.");
  if (!next.issuedAt) warnings.push("No se leyó la fecha.");
  return { ...next, warnings: [...new Set(warnings)] };
}

export function orderOcrPrompt(kind: OrderOcrKind, filename: string) {
  return `Leé esta orden de NextMedia (Next International Communication SRL, agencia de vía pública argentina) y devolvé SOLO un JSON.

Se espera una ${ORDER_OCR_KIND_LABEL[kind]}. Archivo: ${filename}

Hay tres familias de órdenes, cada una con formatos distintos:
1. "ORDEN DE COMPRA" con número terminado en C (ej. 10.2026.0046 C): es la VENTA al cliente/anunciante. Tiene una grilla con
   elementos, ubicaciones, plaza, días del mes, cantidades (ubicaciones, caras, períodos) y costos. Al pie: subtotal exhibición,
   elementos bonificados, subtotal producción, servicio agencia %, subtotal neto, IVA y total.
2. "ORDEN DE PUBLICIDAD" con número terminado en M (ej. 10.2026.0057.0005 M): es la COMPRA al medio. "Razón Social" y "Medio"
   son el proveedor. Puede traer un producto suelto (CPM, MAX2, medidas, caras por circuito, costo por cara) o una tabla de
   dispositivos/ubicaciones/estaciones. Al pie suele haber subtotal o costo mensual y cierres como "CONFIDENCIAL AGENCIA 10%",
   "DESCUENTO ESPECIAL 15%" o "DESCUENTO COMPRA AMBOS FORMATOS" que se encadenan, y el "COSTO NETO TOTAL ... + IVA".
3. "ORDEN DE PRODUCCIÓN" con número terminado en P: es la orden a la imprenta/productor ("Razón Social"). Trae producto,
   medidas, soporte de impresión, cantidad de afiches, motivos, costo neto de producción + IVA, detalle FC, prueba color
   y retiro de material impreso con destinos y cantidades.

Reglas:
- Fechas en YYYY-MM-DD. Si la fecha no trae año (ej. 12/10), usá el año del número de orden.
- Importes como números (1234.56), nunca strings. Los importes entre paréntesis son positivos.
- number: el número completo con su letra (ej. "10.2026.0057.0007-1 M"). Si además figura "AYR 10.2026.0057.0007 M"
  (orden que se ajusta o reemplaza) ponelo en observations.
- Siempre el VALOR del campo, nunca el rótulo (printShop "TALLERES DEL SUR", no "IMPRENTA").
- vendorTaxId: el CUIT del proveedor solo si figura; el CUIT 30-71144767-5 es de NextMedia, no lo uses.
- month: número de mes (1 a 12) del período de la campaña.
- documentTitle: el título tal cual ("ORDEN DE COMPRA", "ORDEN DE PUBLICIDAD", "ORDEN DE PRODUCCIÓN").
- client: el anunciante ("Cliente:"). vendor: la "Razón Social" / "Medio" (solo compra y producción).
- product: el "Producto:" (en compra y producción suele ser la marca o el evento, ej. LOLLAPALOOZA).
  En venta, product es "PRODUCTO:" o "SHOW:" y campaign es "CAMPAÑA:".
- media (solo compra): el tipo de elemento ("CPM", "MAX2", "VALLA MÓVIL LED", "PANTALLA LED", "BOCA DE SUBTE DIGITAL"...).
- support: "DIGITAL" o "TRADICIONAL" si figura. plaza: CABA, SAN ISIDRO, ZONA NORTE, etc.
- grossNet (solo compra): el costo ANTES de los cierres (subtotal mensual, costo neto mensual N elementos, subtotal neto).
- adjustments (solo compra): cada cierre en orden de aparición. kind "deduct" si resta (aunque figure sin signo), "add" si suma.
  percent con el % si figura; amount con el importe en positivo.
- net: neto final antes de IVA. En venta es el subtotal antes del IVA (ya incluye servicio agencia). En compra es el costo neto total.
- vat: el IVA si figura. vatRate: 21 salvo que diga otra alícuota o que la orden no lleve IVA (0).
- total: total con IVA si figura.
- agencyFee (solo venta): el % de "SERVICIO AGENCIA".
- saleItems (solo venta): una fila por elemento de la grilla. element = columna "ELEMENTO" o "FORMATO"
  (ej. "BOCA DIGITAL SUBTE (EXCLUSIVO)", "PANTALLA LED (ROTATIVO)", "SEXTUPLES"), nunca null.
  location = ubicación/circuito, plaza = plaza o zona,
  quantity = ubicaciones, faces = caras, days = días, measures = medidas/spots (ej. "192 SPOTS DIARIOS - 15\""),
  unitCost = costo neto unitario o por período, exhibitionNet = costo neto total de exhibición de la fila,
  productionNet = costo de producción de la fila, startsAt/endsAt del período.
  Filas "BONIFICADO" van con exhibitionNet 0. Si los bonificados figuran solo como total, ponelo en bonusNet de la primera fila.
- purchaseItems (solo compra con tabla de dispositivos): element = dispositivo, location = ubicación/estación/línea,
  quantity = cantidad o caras, days, measures, unitCost = costo mensual unitario, net = costo neto de ESA fila
  (el "COSTO NETO PAUTA" de la fila si existe, si no unitCost por cantidad de dispositivos; 0 si es bonificado).
  Nunca repitas el total de la orden en cada fila: la suma de net debe dar grossNet.
  Si la orden trae un solo producto sin tabla, una sola fila con el total bruto. Incluí TODAS las filas de la tabla.
- locations (solo compra): texto con las ubicaciones/estaciones si hay más de una.
- spotCount: cantidad de ubicaciones/caras. days: días de exhibición. unitCost: costo neto unitario/por cara.
- costLabel: la leyenda del costo final (ej. "COSTO NETO TOTAL EXHIBICION").
- printShop / printSupport: "IMPRENTA" y "SOPORTE DE IMPRESIÓN".
- Producción: quantity = cantidad de afiches, motifs = cantidad de motivos, invoiceDetail = "DETALLE FC",
  colorProof = indicación de prueba color, pickup = texto de retiro, deliveries = destinos con su cantidad,
  productionItems = una fila con el producto, medidas, soporte, cantidad y costo neto.
- observations: condiciones particulares (colocación fuera de término, fecha sujeta a material, condiciones comerciales,
  observaciones numeradas). No copies los textos fijos de certificación fotográfica ni de aceptación de la orden.
- Si un dato no está, null o lista vacía. No inventes.
- warnings: problemas de lectura o cuentas que no cierran.

JSON:
{
  "documentTitle": "",
  "number": "",
  "issuedAt": "2026-10-02",
  "client": "",
  "vendor": null,
  "vendorTaxId": null,
  "product": null,
  "campaign": null,
  "plaza": null,
  "periodLabel": null,
  "month": null,
  "year": null,
  "startsAt": null,
  "endsAt": null,
  "days": null,
  "media": null,
  "measures": null,
  "support": null,
  "circuit": null,
  "spotCount": null,
  "unitCost": null,
  "costLabel": null,
  "locations": null,
  "printShop": null,
  "printSupport": null,
  "quantity": null,
  "motifs": null,
  "invoiceDetail": null,
  "colorProof": null,
  "pickup": null,
  "agencyFee": null,
  "grossNet": null,
  "net": 0,
  "vatRate": 21,
  "vat": null,
  "total": null,
  "observations": null,
  "saleItems": [
    { "element": "CPM", "location": "CIRCUITO CABA", "plaza": "CABA", "quantity": 200, "faces": 400, "days": 4,
      "measures": null, "unitCost": 0, "exhibitionNet": 4800000, "bonusNet": 0, "productionNet": 710000,
      "startsAt": "2026-10-22", "endsAt": "2026-10-25" }
  ],
  "purchaseItems": [
    { "element": "BACKS DOBLES", "location": "FFCC MITRE - BELGRANO R", "quantity": 2, "days": 30, "measures": null,
      "unitCost": 631300, "net": 631300 }
  ],
  "adjustments": [
    { "label": "DESCUENTO ESPECIAL", "kind": "deduct", "percent": 15, "amount": 283950 },
    { "label": "CONFIDENCIAL AGENCIA", "kind": "deduct", "percent": 10, "amount": 160905 }
  ],
  "productionItems": [
    { "element": "CPM", "location": null, "quantity": 1300, "measures": "1,48 X 1,10", "printSupport": "PAPEL", "net": 785000 }
  ],
  "deliveries": [{ "destination": "PC", "quantity": 500 }],
  "warnings": []
}
Las filas de ejemplo muestran el formato: reemplazalas por las de la orden o dejá la lista vacía si no corresponde al tipo.`;
}

/* ---------- Borradores de formulario ---------- */

export type ErpOrderLineDraft = { id?: string; values: Record<string, string> };

type OrderDraftBase = {
  number: string;
  product: string;
  issuedAt: string;
  estado: string;
  cashPayment: boolean;
  observations: string;
  attachmentUrl: string;
};

export type SaleOrderDraft = OrderDraftBase & {
  clientId: string;
  plaza: string;
  month: string;
  year: string;
  periodLabel: string;
  agencyFee: string;
  net: string;
  vat: string;
  vatRate: string;
  items: ErpOrderLineDraft[];
};

export type PurchaseOrderDraft = OrderDraftBase & {
  saleOrderId: string;
  vendorId: string;
  media: string;
  circuit: string;
  support: string;
  plaza: string;
  measures: string;
  startsAt: string;
  endsAt: string;
  days: string;
  spotCount: string;
  paidQty: string;
  bonusQty: string;
  unitCost: string;
  costLabel: string;
  grossNet: string;
  vatRate: string;
  printShop: string;
  printSupport: string;
  locations: string;
  items: ErpOrderLineDraft[];
  adjustments: ErpOrderLineDraft[];
};

export type ProductionOrderDraft = OrderDraftBase & {
  saleOrderId: string;
  vendorId: string;
  measures: string;
  printSupport: string;
  quantity: string;
  motifs: string;
  unitCost: string;
  invoiceDetail: string;
  net: string;
  vat: string;
  vatRate: string;
  colorProof: string;
  pickup: string;
  items: ErpOrderLineDraft[];
  deliveries: ErpOrderLineDraft[];
};

function str(value: number | string | null | undefined) {
  return value == null ? "" : String(value);
}

function amountStr(value: number | null | undefined) {
  return value ? String(value) : "";
}

export function saleDraftFromOcr(result: OrderOcrMatchResult, base: SaleOrderDraft): SaleOrderDraft {
  const e = result.extracted;
  return {
    ...base,
    clientId: result.client?.id ?? base.clientId,
    number: e.number ?? base.number,
    product: [e.product, e.campaign && e.campaign !== e.product ? e.campaign : null].filter(Boolean).join(" · ") || base.product,
    plaza: e.plaza ?? base.plaza,
    issuedAt: e.issuedAt ?? base.issuedAt,
    month: str(e.month) || base.month,
    year: str(e.year) || base.year,
    periodLabel: e.periodLabel ?? base.periodLabel,
    agencyFee: str(e.agencyFee),
    net: str(e.net),
    vat: str(e.vat),
    vatRate: str(e.vatRate),
    observations: e.observations ?? base.observations,
    attachmentUrl: result.attachmentUrl ?? base.attachmentUrl,
    items: e.saleItems.map((item) => ({
      values: {
        element: item.element,
        location: item.plaza ?? e.plaza ?? "",
        plaza: item.location ?? "",
        quantity: amountStr(item.quantity),
        faces: amountStr(item.faces),
        days: str(item.days),
        measures: item.measures ?? "",
        unitCost: amountStr(item.unitCost),
        exhibitionNet: amountStr(item.exhibitionNet),
        bonusNet: amountStr(item.bonusNet),
        productionNet: amountStr(item.productionNet),
        startsAt: item.startsAt ?? e.startsAt ?? "",
        endsAt: item.endsAt ?? e.endsAt ?? "",
      },
    })),
  };
}

export function purchaseDraftFromOcr(result: OrderOcrMatchResult, base: PurchaseOrderDraft): PurchaseOrderDraft {
  const e = result.extracted;
  return {
    ...base,
    saleOrderId: result.saleOrder?.id ?? base.saleOrderId,
    vendorId: result.vendor?.id ?? e.vendor?.toUpperCase() ?? base.vendorId,
    number: e.number ?? base.number,
    product: e.product ?? base.product,
    media: e.media ?? base.media,
    circuit: e.circuit ?? base.circuit,
    support: e.support ?? base.support,
    plaza: e.plaza ?? base.plaza,
    measures: e.measures ?? base.measures,
    issuedAt: e.issuedAt ?? base.issuedAt,
    startsAt: e.startsAt ?? "",
    endsAt: e.endsAt ?? "",
    days: str(e.days),
    spotCount: str(e.spotCount),
    unitCost: amountStr(e.unitCost),
    costLabel: e.costLabel ?? "",
    grossNet: amountStr(e.grossNet),
    vatRate: str(e.vatRate),
    printShop: e.printShop ?? "",
    printSupport: e.printSupport ?? "",
    locations: e.locations ?? "",
    observations: e.observations ?? base.observations,
    attachmentUrl: result.attachmentUrl ?? base.attachmentUrl,
    items: e.purchaseItems.map((item) => ({
      values: {
        element: item.element,
        location: item.location ?? "",
        quantity: amountStr(item.quantity),
        days: str(item.days),
        measures: item.measures ?? "",
        unitCost: amountStr(item.unitCost),
        net: amountStr(item.net),
      },
    })),
    adjustments: e.adjustments.map((adj) => ({
      values: {
        label: adj.label,
        kind: String(adj.kind),
        percent: str(adj.percent),
        amount: amountStr(adj.amount),
      },
    })),
  };
}

export function productionDraftFromOcr(result: OrderOcrMatchResult, base: ProductionOrderDraft): ProductionOrderDraft {
  const e = result.extracted;
  const quantity = e.quantity ?? e.productionItems[0]?.quantity ?? null;
  return {
    ...base,
    saleOrderId: result.saleOrder?.id ?? base.saleOrderId,
    vendorId: result.vendor?.id ?? e.vendor?.toUpperCase() ?? base.vendorId,
    number: e.number ?? base.number,
    product: e.product ?? base.product,
    measures: e.measures ?? e.productionItems[0]?.measures ?? base.measures,
    printSupport: e.printSupport ?? e.productionItems[0]?.printSupport ?? base.printSupport,
    quantity: amountStr(quantity),
    motifs: e.motifs ?? "",
    unitCost: amountStr(e.unitCost ?? (quantity && e.net ? round2(e.net / quantity) : null)),
    invoiceDetail: e.invoiceDetail ?? "",
    issuedAt: e.issuedAt ?? base.issuedAt,
    net: str(e.net),
    vat: str(e.vat),
    vatRate: str(e.vatRate),
    colorProof: e.colorProof ?? "",
    pickup: e.pickup ?? "",
    observations: e.observations ?? base.observations,
    attachmentUrl: result.attachmentUrl ?? base.attachmentUrl,
    items: e.productionItems.map((item) => ({
      values: {
        element: item.element,
        location: item.location ?? "",
        quantity: amountStr(item.quantity),
        measures: item.measures ?? "",
        printSupport: item.printSupport ?? "",
        net: amountStr(item.net),
      },
    })),
    deliveries: e.deliveries.map((d) => ({
      values: { destination: d.destination, quantity: amountStr(d.quantity) },
    })),
  };
}
