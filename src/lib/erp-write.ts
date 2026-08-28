import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ERP_ORDER, nextAutoOrderEstado, requiredString } from "@/lib/erp";

export type ErpResult = { ok: true } | { ok: false; error: string };

export function erpFail(e: unknown): Extract<ErpResult, { ok: false }> {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, error: "Ya existe un registro con esos datos." };
    if (e.code === "P2003" || e.code === "P2014") {
      return { ok: false, error: "No se puede borrar: tiene movimientos asociados." };
    }
    if (e.code === "P2025") return { ok: false, error: "El registro ya no existe." };
  }
  return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar." };
}

export function requiredId(raw: FormDataEntryValue | string | null | undefined, label = "el registro") {
  return requiredString(raw, label);
}

export async function syncSaleOrderEstado(saleOrderId: string) {
  const [order, agg] = await Promise.all([
    prisma.erpSaleOrder.findUniqueOrThrow({
      where: { id: saleOrderId },
      select: { amount: true, estado: true },
    }),
    prisma.erpSaleInvoice.aggregate({
      where: { saleOrderId },
      _sum: { amount: true, vat: true },
    }),
  ]);
  const invoiced = Number(agg._sum.amount ?? 0) + Number(agg._sum.vat ?? 0);
  const estado = nextAutoOrderEstado(invoiced, Number(order.amount), order.estado);
  if (estado !== order.estado) {
    await prisma.erpSaleOrder.update({ where: { id: saleOrderId }, data: { estado } });
  }
}

export async function syncPurchaseOrderEstado(purchaseOrderId: string) {
  const order = await prisma.erpPurchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    select: { amount: true, estado: true },
  });
  const links = await prisma.erpPurchaseInvoiceOrder.findMany({
    where: { purchaseOrderId },
    include: { invoice: { select: { amount: true, vat: true } } },
  });
  const invoiced = links.reduce(
    (acc, l) => acc + Number(l.invoice.amount) + Number(l.invoice.vat),
    0,
  );
  const estado = nextAutoOrderEstado(invoiced, Number(order.amount), order.estado);
  if (estado !== order.estado) {
    await prisma.erpPurchaseOrder.update({ where: { id: purchaseOrderId }, data: { estado } });
  }
}

export async function syncProductionOrderEstado(productionOrderId: string) {
  const order = await prisma.erpProductionOrder.findUniqueOrThrow({
    where: { id: productionOrderId },
    select: { amount: true, estado: true },
  });
  const links = await prisma.erpPurchaseInvoiceOrder.findMany({
    where: { productionOrderId },
    include: { invoice: { select: { amount: true, vat: true } } },
  });
  const invoiced = links.reduce(
    (acc, l) => acc + Number(l.invoice.amount) + Number(l.invoice.vat),
    0,
  );
  const estado = nextAutoOrderEstado(invoiced, Number(order.amount), order.estado);
  if (estado !== order.estado) {
    await prisma.erpProductionOrder.update({ where: { id: productionOrderId }, data: { estado } });
  }
}

export async function syncLinkedPurchaseOrders(invoiceId: string) {
  const links = await prisma.erpPurchaseInvoiceOrder.findMany({
    where: { invoiceId },
    select: { purchaseOrderId: true, productionOrderId: true },
  });
  for (const link of links) {
    if (link.purchaseOrderId) await syncPurchaseOrderEstado(link.purchaseOrderId);
    if (link.productionOrderId) await syncProductionOrderEstado(link.productionOrderId);
  }
}

export const ERP_ORDER_ESTADOS = [
  { value: String(ERP_ORDER.draft), label: "Borrador" },
  { value: String(ERP_ORDER.issued), label: "Emitida" },
  { value: String(ERP_ORDER.invoiced), label: "Facturada" },
] as const;
