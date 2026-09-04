"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";
import { ERP_ORDER, parseDateField, parseIntField, parseMoney, requiredString } from "@/lib/erp";
import { erpFail, requiredId, type ErpResult } from "@/lib/erp-write";

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
}

function saleOrderData(formData: FormData) {
  const issuedAt = parseDateField(formData.get("issuedAt"));
  if (!issuedAt) throw new Error("Indicá la fecha.");
  const net = parseMoney(formData.get("net"));
  const vat = parseMoney(formData.get("vat"));
  return {
    clientId: requiredString(formData.get("clientId"), "el cliente"),
    issuedAt,
    month: parseIntField(formData.get("month"), issuedAt.getMonth() + 1),
    year: parseIntField(formData.get("year"), issuedAt.getFullYear()),
    number: requiredString(formData.get("number"), "el número").toUpperCase(),
    net,
    vat,
    amount: net + vat,
    estado: parseIntField(formData.get("estado"), ERP_ORDER.issued),
    cashPayment: String(formData.get("cashPayment") ?? "") === "1",
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
    net,
    vat,
    amount: net + vat,
    estado: parseIntField(formData.get("estado"), ERP_ORDER.issued),
    cashPayment: String(formData.get("cashPayment") ?? "") === "1",
  };
}

export async function createErpSaleOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpSaleOrder.create({ data: saleOrderData(formData) });
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
    await prisma.erpSaleOrder.update({ where: { id }, data: saleOrderData(formData) });
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
    await prisma.erpPurchaseOrder.create({ data: linkedOrderData(formData) });
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
    await prisma.erpPurchaseOrder.update({ where: { id }, data: linkedOrderData(formData) });
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
    await prisma.erpProductionOrder.create({
      data: { ...data, vendorId: requiredString(formData.get("vendorId"), "el productor") },
    });
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
    await prisma.erpProductionOrder.update({
      where: { id },
      data: { ...data, vendorId: requiredString(formData.get("vendorId"), "el productor") },
    });
    refreshOrders();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpCampaignItem(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpCampaignItem.create({
      data: {
        saleOrderId: requiredString(formData.get("saleOrderId"), "la orden"),
        element: requiredString(formData.get("element"), "el elemento"),
        location: String(formData.get("location") ?? "").trim() || null,
        quantity: parseMoney(formData.get("quantity")),
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
