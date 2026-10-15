"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";
import {
  ERP_ORDER,
  ERP_VENDOR,
  erpCashAmount,
  optionalString,
  parseDateField,
  parseIntField,
  parseMoney,
  parseOptionalInt,
  parseOptionalMoney,
  requiredString,
} from "@/lib/erp";
import {
  erpFail,
  requiredId,
  syncProductionOrderEstado,
  syncPurchaseOrderEstado,
  syncSaleOrderEstado,
  type ErpResult,
} from "@/lib/erp-write";
import { parseFormLines } from "@/lib/erp-form-lines";
import {
  ERP_ADJUSTMENT,
  purchaseBreakdown,
  purchaseVat,
  type PurchaseAdjustment,
} from "@/lib/erp-order-docs";
import { ensureErpElementName, ensureErpPlazaName } from "@/lib/erp-catalog";

const PURCHASE_LINE_FIELDS = ["element", "location", "quantity", "days", "measures", "unitCost", "net"] as const;
const ADJUSTMENT_LINE_FIELDS = ["label", "kind", "percent", "amount"] as const;
const PRODUCTION_LINE_FIELDS = ["element", "location", "quantity", "measures", "printSupport", "net"] as const;
const DELIVERY_LINE_FIELDS = ["destination", "quantity"] as const;
const CAMPAIGN_LINE_FIELDS = [
  "element",
  "location",
  "plaza",
  "quantity",
  "faces",
  "days",
  "measures",
  "unitCost",
  "exhibitionNet",
  "bonusNet",
  "productionNet",
  "startsAt",
  "endsAt",
] as const;

function purchaseLinesFromForm(formData: FormData) {
  return parseFormLines(formData, "po", [...PURCHASE_LINE_FIELDS])
    .filter((line) => line.values.element)
    .map((line) => ({
      id: line.id,
      element: line.values.element,
      location: optionalString(line.values.location),
      quantity: parseMoney(line.values.quantity),
      days: parseOptionalInt(line.values.days),
      measures: optionalString(line.values.measures),
      unitCost: parseMoney(line.values.unitCost),
      net: parseMoney(line.values.net),
    }));
}

function adjustmentLinesFromForm(formData: FormData) {
  return parseFormLines(formData, "aj", [...ADJUSTMENT_LINE_FIELDS])
    .filter((line) => line.values.label)
    .map((line, index) => ({
      id: line.id,
      label: line.values.label.toUpperCase(),
      kind: parseIntField(line.values.kind, ERP_ADJUSTMENT.deduct),
      percent: parseOptionalMoney(line.values.percent),
      amount: parseMoney(line.values.amount),
      sortOrder: index,
    }));
}

function productionLinesFromForm(formData: FormData) {
  return parseFormLines(formData, "pr", [...PRODUCTION_LINE_FIELDS])
    .filter((line) => line.values.element)
    .map((line) => ({
      id: line.id,
      element: line.values.element,
      location: optionalString(line.values.location),
      quantity: parseMoney(line.values.quantity),
      measures: optionalString(line.values.measures),
      printSupport: optionalString(line.values.printSupport),
      net: parseMoney(line.values.net),
    }));
}

function deliveryLinesFromForm(formData: FormData) {
  return parseFormLines(formData, "dl", [...DELIVERY_LINE_FIELDS])
    .filter((line) => line.values.destination)
    .map((line) => ({
      id: line.id,
      destination: line.values.destination,
      quantity: parseMoney(line.values.quantity),
    }));
}

function dropLineId<T extends { id: string | null }>(line: T): Omit<T, "id"> {
  const copy = { ...line };
  delete (copy as { id?: string | null }).id;
  return copy;
}

function campaignLinesFromForm(formData: FormData) {
  return parseFormLines(formData, "ci", [...CAMPAIGN_LINE_FIELDS])
    .filter((line) => line.values.element)
    .map((line) => ({
      id: line.id,
      element: line.values.element,
      location: optionalString(line.values.location),
      plaza: optionalString(line.values.plaza),
      quantity: parseMoney(line.values.quantity),
      faces: parseMoney(line.values.faces),
      days: parseOptionalInt(line.values.days),
      measures: optionalString(line.values.measures),
      unitCost: parseMoney(line.values.unitCost),
      exhibitionNet: parseMoney(line.values.exhibitionNet),
      bonusNet: parseMoney(line.values.bonusNet),
      productionNet: parseMoney(line.values.productionNet),
      startsAt: parseDateField(line.values.startsAt),
      endsAt: parseDateField(line.values.endsAt),
    }));
}

type Result = ErpResult;

function refreshOrders() {
  revalidatePath("/backoffice");
  revalidatePath("/backoffice/gestion");
  revalidatePath("/backoffice/ordenes/venta");
  revalidatePath("/backoffice/ordenes/compra");
  revalidatePath("/backoffice/ordenes/produccion");
  revalidatePath("/backoffice/facturacion/venta");
  revalidatePath("/backoffice/facturacion/compra");
  revalidatePath("/backoffice/informe");
  revalidatePath("/backoffice/config/elementos");
  revalidatePath("/backoffice/config/plazas");
  revalidatePath("/backoffice/proveedores");
}

async function withCampaignCatalog<T extends { element: string; location?: string | null }>(lines: T[]): Promise<T[]> {
  return Promise.all(
    lines.map(async (line) => ({
      ...line,
      element: await ensureErpElementName(line.element),
      location: line.location ? await ensureErpPlazaName(line.location) : line.location,
    })),
  );
}

async function withPurchaseCatalog<T extends { element: string }>(lines: T[]): Promise<T[]> {
  return Promise.all(
    lines.map(async (line) => ({
      ...line,
      element: await ensureErpElementName(line.element),
    })),
  );
}

/** El selector de proveedor acepta un nombre nuevo (p. ej. el medio leído del PDF): se da de alta al guardar. */
async function resolveVendorId(raw: FormDataEntryValue | null, kind: number, noun: string) {
  const value = requiredString(raw, noun);
  const byId = await prisma.erpVendor.findUnique({ where: { id: value }, select: { id: true } });
  if (byId) return byId.id;
  const name = value.toUpperCase();
  const byName = await prisma.erpVendor.findFirst({
    where: { kind, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) return byName.id;
  const created = await prisma.erpVendor.create({ data: { kind, name }, select: { id: true } });
  return created.id;
}

/** Condición de pago: con factura, efectivo, o una parte de cada una (el efectivo no lleva IVA). */
function cashFields(formData: FormData, net: number) {
  const cashAmount = erpCashAmount(String(formData.get("cashMode") ?? ""), net, parseMoney(formData.get("cashAmount")));
  return { cashAmount, cashPayment: cashAmount > 0 };
}

async function saleOrderData(formData: FormData) {
  const issuedAt = parseDateField(formData.get("issuedAt"));
  if (!issuedAt) throw new Error("Indicá la fecha.");
  const net = parseMoney(formData.get("net"));
  const vat = parseMoney(formData.get("vat"));
  const plazaRaw = optionalString(formData.get("plaza"));
  return {
    clientId: requiredString(formData.get("clientId"), "el cliente"),
    issuedAt,
    month: parseIntField(formData.get("month"), issuedAt.getMonth() + 1),
    year: parseIntField(formData.get("year"), issuedAt.getFullYear()),
    number: requiredString(formData.get("number"), "el número").toUpperCase(),
    product: optionalString(formData.get("product")),
    plaza: plazaRaw ? await ensureErpPlazaName(plazaRaw) : plazaRaw,
    periodLabel: optionalString(formData.get("periodLabel")),
    observations: optionalString(formData.get("observations")),
    agencyFee: parseOptionalMoney(formData.get("agencyFee")),
    net,
    vat,
    amount: net + vat,
    estado: parseIntField(formData.get("estado"), ERP_ORDER.issued),
    ...cashFields(formData, net),
    attachmentUrl: optionalString(formData.get("attachmentUrl")),
  };
}

function linkedOrderData(formData: FormData) {
  const issuedAt = parseDateField(formData.get("issuedAt"));
  if (!issuedAt) throw new Error("Indicá la fecha.");
  const net = parseMoney(formData.get("net"));
  const vat = parseMoney(formData.get("vat"));
  return {
    saleOrderId: requiredString(formData.get("saleOrderId"), "la O.P. de venta"),
    vendorId: requiredString(formData.get("vendorId"), "el proveedor"),
    issuedAt,
    number: requiredString(formData.get("number"), "el número").toUpperCase(),
    product: optionalString(formData.get("product")),
    net,
    vat,
    amount: net + vat,
    estado: parseIntField(formData.get("estado"), ERP_ORDER.issued),
    ...cashFields(formData, net),
    attachmentUrl: optionalString(formData.get("attachmentUrl")),
  };
}

async function purchaseExtraData(formData: FormData) {
  const plazaRaw = optionalString(formData.get("plaza"));
  return {
    media: optionalString(formData.get("media")),
    measures: optionalString(formData.get("measures")),
    locations: optionalString(formData.get("locations")),
    circuit: optionalString(formData.get("circuit")),
    support: optionalString(formData.get("support")),
    plaza: plazaRaw ? await ensureErpPlazaName(plazaRaw) : plazaRaw,
    costLabel: optionalString(formData.get("costLabel")),
    days: parseOptionalInt(formData.get("days")),
    spotCount: parseOptionalInt(formData.get("spotCount")),
    startsAt: parseDateField(formData.get("startsAt")),
    endsAt: parseDateField(formData.get("endsAt")),
    paidQty: parseMoney(formData.get("paidQty")),
    bonusQty: parseMoney(formData.get("bonusQty")),
    unitCost: parseMoney(formData.get("unitCost")),
    observations: optionalString(formData.get("observations")),
    printShop: optionalString(formData.get("printShop")),
    printSupport: optionalString(formData.get("printSupport")),
  };
}

/**
 * En compra no se tipea ni el neto ni el IVA: el neto sale del costo bruto menos
 * los ajustes del cierre, y el IVA de aplicarle la alícuota a ese neto. Si se
 * tipearan sueltos quedan desfasados apenas cambia un ajuste.
 */
async function purchaseOrderData(
  formData: FormData,
  items: { net: number }[],
  adjustments: PurchaseAdjustment[],
) {
  const base = linkedOrderData(formData);
  const { gross, net } = purchaseBreakdown({
    grossNet: parseMoney(formData.get("grossNet")),
    items,
    adjustments,
  });
  const vatRate = parseMoney(formData.get("vatRate"));
  const cash = cashFields(formData, net);
  const vat = purchaseVat(net - cash.cashAmount, vatRate);
  return {
    ...base,
    ...cash,
    vendorId: await resolveVendorId(formData.get("vendorId"), ERP_VENDOR.media, "el proveedor"),
    ...(await purchaseExtraData(formData)),
    grossNet: gross,
    net,
    vatRate,
    vat,
    amount: net + vat,
  };
}

function productionExtraData(formData: FormData) {
  return {
    measures: optionalString(formData.get("measures")),
    printSupport: optionalString(formData.get("printSupport")),
    quantity: parseMoney(formData.get("quantity")),
    motifs: optionalString(formData.get("motifs")),
    unitCost: parseMoney(formData.get("unitCost")),
    invoiceDetail: optionalString(formData.get("invoiceDetail")),
    observations: optionalString(formData.get("observations")),
    pickup: optionalString(formData.get("pickup")),
    colorProof: optionalString(formData.get("colorProof")),
  };
}

export async function createErpSaleOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const items = (await withCampaignCatalog(campaignLinesFromForm(formData))).map(dropLineId);
    const data = await saleOrderData(formData);
    const created = await prisma.erpSaleOrder.create({
      data: { ...data, items: items.length ? { create: items } : undefined },
      select: { id: true },
    });
    if (data.cashAmount > 0) await syncSaleOrderEstado(created.id);
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpSaleOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const lines = await withCampaignCatalog(campaignLinesFromForm(formData));
    const keep = lines.map((l) => l.id).filter((lineId): lineId is string => Boolean(lineId));
    const orderData = await saleOrderData(formData);
    await prisma.$transaction(async (tx) => {
      await tx.erpSaleOrder.update({ where: { id }, data: orderData });
      await tx.erpCampaignItem.deleteMany({
        where: { saleOrderId: id, ...(keep.length ? { id: { notIn: keep } } : {}) },
      });
      for (const line of lines) {
        const { id: lineId, ...data } = line;
        if (lineId) await tx.erpCampaignItem.update({ where: { id: lineId }, data });
        else await tx.erpCampaignItem.create({ data: { saleOrderId: id, ...data } });
      }
    });
    if (orderData.cashAmount > 0) await syncSaleOrderEstado(id);
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpSaleOrder(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const [invoices, purchases, productions] = await Promise.all([
      prisma.erpSaleInvoice.count({ where: { saleOrderId: id } }),
      prisma.erpPurchaseOrder.count({ where: { saleOrderId: id } }),
      prisma.erpProductionOrder.count({ where: { saleOrderId: id } }),
    ]);
    if (invoices + purchases + productions > 0) {
      throw new Error("No se puede borrar: tiene facturas u órdenes de compra/producción.");
    }
    await prisma.erpSaleOrder.delete({ where: { id } });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpPurchaseOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const lines = await withPurchaseCatalog(purchaseLinesFromForm(formData));
    const adjustmentLines = adjustmentLinesFromForm(formData);
    const items = lines.map(dropLineId);
    const adjustments = adjustmentLines.map(dropLineId);
    const data = await purchaseOrderData(formData, lines, adjustmentLines);
    const created = await prisma.erpPurchaseOrder.create({
      data: {
        ...data,
        items: items.length ? { create: items } : undefined,
        adjustments: adjustments.length ? { create: adjustments } : undefined,
      },
      select: { id: true },
    });
    if (data.cashAmount > 0) await syncPurchaseOrderEstado(created.id);
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpPurchaseOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const lines = await withPurchaseCatalog(purchaseLinesFromForm(formData));
    const adjustmentLines = adjustmentLinesFromForm(formData);
    const keep = lines.map((l) => l.id).filter((lineId): lineId is string => Boolean(lineId));
    const keepAdjustments = adjustmentLines
      .map((l) => l.id)
      .filter((lineId): lineId is string => Boolean(lineId));
    const data = await purchaseOrderData(formData, lines, adjustmentLines);
    await prisma.$transaction(async (tx) => {
      await tx.erpPurchaseOrder.update({ where: { id }, data });
      await tx.erpPurchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id, ...(keep.length ? { id: { notIn: keep } } : {}) },
      });
      await tx.erpPurchaseOrderAdjustment.deleteMany({
        where: { purchaseOrderId: id, ...(keepAdjustments.length ? { id: { notIn: keepAdjustments } } : {}) },
      });
      for (const line of lines) {
        const { id: lineId, ...row } = line;
        if (lineId) await tx.erpPurchaseOrderItem.update({ where: { id: lineId }, data: row });
        else await tx.erpPurchaseOrderItem.create({ data: { purchaseOrderId: id, ...row } });
      }
      for (const line of adjustmentLines) {
        const { id: lineId, ...row } = line;
        if (lineId) await tx.erpPurchaseOrderAdjustment.update({ where: { id: lineId }, data: row });
        else await tx.erpPurchaseOrderAdjustment.create({ data: { purchaseOrderId: id, ...row } });
      }
    });
    if (data.cashAmount > 0) await syncPurchaseOrderEstado(id);
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpPurchaseOrder(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const links = await prisma.erpPurchaseInvoiceOrder.count({ where: { purchaseOrderId: id } });
    if (links > 0) throw new Error("No se puede borrar: tiene facturas asociadas.");
    await prisma.erpPurchaseOrder.delete({ where: { id } });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpProductionOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const data = linkedOrderData(formData);
    const items = productionLinesFromForm(formData).map(dropLineId);
    const deliveries = deliveryLinesFromForm(formData).map(dropLineId);
    const vendorId = await resolveVendorId(formData.get("vendorId"), ERP_VENDOR.producer, "el productor");
    const created = await prisma.erpProductionOrder.create({
      data: {
        ...data,
        ...productionExtraData(formData),
        vendorId,
        items: items.length ? { create: items } : undefined,
        deliveries: deliveries.length ? { create: deliveries } : undefined,
      },
      select: { id: true },
    });
    if (data.cashAmount > 0) await syncProductionOrderEstado(created.id);
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpProductionOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const data = linkedOrderData(formData);
    const itemLines = productionLinesFromForm(formData);
    const deliveryLines = deliveryLinesFromForm(formData);
    const keepItems = itemLines.map((l) => l.id).filter((lineId): lineId is string => Boolean(lineId));
    const keepDeliveries = deliveryLines.map((l) => l.id).filter((lineId): lineId is string => Boolean(lineId));
    const vendorId = await resolveVendorId(formData.get("vendorId"), ERP_VENDOR.producer, "el productor");
    await prisma.$transaction(async (tx) => {
      await tx.erpProductionOrder.update({
        where: { id },
        data: {
          ...data,
          ...productionExtraData(formData),
          vendorId,
        },
      });
      await tx.erpProductionOrderItem.deleteMany({
        where: { productionOrderId: id, ...(keepItems.length ? { id: { notIn: keepItems } } : {}) },
      });
      await tx.erpProductionDelivery.deleteMany({
        where: { productionOrderId: id, ...(keepDeliveries.length ? { id: { notIn: keepDeliveries } } : {}) },
      });
      for (const line of itemLines) {
        const { id: lineId, ...row } = line;
        if (lineId) await tx.erpProductionOrderItem.update({ where: { id: lineId }, data: row });
        else await tx.erpProductionOrderItem.create({ data: { productionOrderId: id, ...row } });
      }
      for (const line of deliveryLines) {
        const { id: lineId, ...row } = line;
        if (lineId) await tx.erpProductionDelivery.update({ where: { id: lineId }, data: row });
        else await tx.erpProductionDelivery.create({ data: { productionOrderId: id, ...row } });
      }
    });
    if (data.cashAmount > 0) await syncProductionOrderEstado(id);
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpCampaignItem(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const element = await ensureErpElementName(requiredString(formData.get("element"), "el elemento"));
    const locationRaw = optionalString(formData.get("location"));
    await prisma.erpCampaignItem.create({
      data: {
        saleOrderId: requiredString(formData.get("saleOrderId"), "la orden"),
        element,
        location: locationRaw ? await ensureErpPlazaName(locationRaw) : locationRaw,
        plaza: optionalString(formData.get("plaza")),
        quantity: parseMoney(formData.get("quantity")),
        days: parseOptionalInt(formData.get("days")),
        faces: parseMoney(formData.get("faces")),
        measures: optionalString(formData.get("measures")),
        unitCost: parseMoney(formData.get("unitCost")),
        exhibitionNet: parseMoney(formData.get("exhibitionNet")),
        bonusNet: parseMoney(formData.get("bonusNet")),
        productionNet: parseMoney(formData.get("productionNet")),
        startsAt: parseDateField(formData.get("startsAt")),
        endsAt: parseDateField(formData.get("endsAt")),
      },
    });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpPurchaseOrderItem(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpPurchaseOrderItem.create({
      data: {
        purchaseOrderId: requiredString(formData.get("purchaseOrderId"), "la orden"),
        element: await ensureErpElementName(requiredString(formData.get("element"), "el elemento")),
        location: optionalString(formData.get("location")),
        quantity: parseMoney(formData.get("quantity")),
        days: parseOptionalInt(formData.get("days")),
        measures: optionalString(formData.get("measures")),
        unitCost: parseMoney(formData.get("unitCost")),
        net: parseMoney(formData.get("net")),
      },
    });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpPurchaseOrderItem(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpPurchaseOrderItem.delete({ where: { id } });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpProductionOrderItem(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpProductionOrderItem.create({
      data: {
        productionOrderId: requiredString(formData.get("productionOrderId"), "la orden"),
        element: requiredString(formData.get("element"), "el dispositivo"),
        location: optionalString(formData.get("location")),
        quantity: parseMoney(formData.get("quantity")),
        measures: optionalString(formData.get("measures")),
        printSupport: optionalString(formData.get("printSupport")),
        net: parseMoney(formData.get("net")),
      },
    });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpProductionOrderItem(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpProductionOrderItem.delete({ where: { id } });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpProductionDelivery(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpProductionDelivery.create({
      data: {
        productionOrderId: requiredString(formData.get("productionOrderId"), "la orden"),
        destination: requiredString(formData.get("destination"), "el destino"),
        quantity: parseMoney(formData.get("quantity")),
      },
    });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpProductionDelivery(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpProductionDelivery.delete({ where: { id } });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpCampaignItem(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCampaignItem.delete({ where: { id } });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpProductionOrder(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const links = await prisma.erpPurchaseInvoiceOrder.count({ where: { productionOrderId: id } });
    if (links > 0) throw new Error("No se puede borrar: tiene facturas asociadas.");
    await prisma.erpProductionOrder.delete({ where: { id } });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}
