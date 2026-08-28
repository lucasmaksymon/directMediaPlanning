"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";
import {
  ERP_COLLECT,
  ERP_PAY,
  ERP_SETTLE,
  parseDateField,
  parseIntField,
  parseMoney,
  requiredString,
} from "@/lib/erp";
import {
  erpFail,
  requiredId,
  syncLinkedPurchaseOrders,
  syncProductionOrderEstado,
  syncPurchaseOrderEstado,
  syncSaleOrderEstado,
  type ErpResult,
} from "@/lib/erp-write";

type Result = ErpResult;

function refreshBilling() {
  revalidatePath("/backoffice");
  revalidatePath("/backoffice/ordenes/venta");
  revalidatePath("/backoffice/ordenes/compra");
  revalidatePath("/backoffice/ordenes/produccion");
  revalidatePath("/backoffice/facturacion/venta");
  revalidatePath("/backoffice/facturacion/compra");
  revalidatePath("/backoffice/facturacion/iva");
  revalidatePath("/backoffice/facturacion/recibos");
  revalidatePath("/backoffice/facturacion/pagos");
  revalidatePath("/backoffice/facturacion/cheques");
  revalidatePath("/backoffice/informe");
  revalidatePath("/backoffice/gestion");
  revalidatePath("/backoffice/facturacion/pendientes");
}

async function resolveDueAt(
  issuedAt: Date,
  paymentDays: number,
  rawDue: FormDataEntryValue | null,
) {
  return parseDateField(rawDue) ?? new Date(issuedAt.getTime() + paymentDays * 86400000);
}

export async function createErpSaleInvoice(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const saleOrderId = requiredString(formData.get("saleOrderId"), "la orden");
    const order = await prisma.erpSaleOrder.findUniqueOrThrow({
      where: { id: saleOrderId },
      select: {
        clientId: true,
        client: {
          select: {
            name: true,
            legalName: true,
            company: { select: { paymentDays: true } },
          },
        },
      },
    });
    const issuedAt = parseDateField(formData.get("issuedAt"));
    if (!issuedAt) throw new Error("Indicá la fecha.");
    await prisma.erpSaleInvoice.create({
      data: {
        clientId: order.clientId,
        saleOrderId,
        issuedAt,
        dueAt: await resolveDueAt(issuedAt, order.client.company.paymentDays, formData.get("dueAt")),
        docType: requiredString(formData.get("docType"), "el tipo").toUpperCase(),
        pos: parseIntField(formData.get("pos")),
        number: parseIntField(formData.get("number")),
        amount: parseMoney(formData.get("amount")),
        vat: parseMoney(formData.get("vat")),
        legalName:
          String(formData.get("legalName") ?? "").trim() ||
          order.client.legalName?.trim() ||
          order.client.name,
        detail: String(formData.get("detail") ?? "").trim() || null,
        collected: parseMoney(formData.get("collected")),
        receiptRef: String(formData.get("receiptRef") ?? "").trim() || null,
        retVat: parseMoney(formData.get("retVat")),
        retSuss: parseMoney(formData.get("retSuss")),
        retGan: parseMoney(formData.get("retGan")),
        retIibb: parseMoney(formData.get("retIibb")),
        echeq: parseMoney(formData.get("echeq")),
        bank: parseMoney(formData.get("bank")),
        attachmentUrl: String(formData.get("attachmentUrl") ?? "").trim() || null,
        collectStatus: parseIntField(formData.get("collectStatus"), ERP_COLLECT.pending),
      },
    });
    await syncSaleOrderEstado(saleOrderId);
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpSaleInvoice(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const current = await prisma.erpSaleInvoice.findUniqueOrThrow({
      where: { id },
      select: { saleOrderId: true },
    });
    const saleOrderId = requiredString(formData.get("saleOrderId"), "la orden");
    const order = await prisma.erpSaleOrder.findUniqueOrThrow({
      where: { id: saleOrderId },
      select: {
        clientId: true,
        client: {
          select: {
            name: true,
            legalName: true,
            company: { select: { paymentDays: true } },
          },
        },
      },
    });
    const issuedAt = parseDateField(formData.get("issuedAt"));
    if (!issuedAt) throw new Error("Indicá la fecha.");
    await prisma.erpSaleInvoice.update({
      where: { id },
      data: {
        clientId: order.clientId,
        saleOrderId,
        issuedAt,
        dueAt: await resolveDueAt(issuedAt, order.client.company.paymentDays, formData.get("dueAt")),
        docType: requiredString(formData.get("docType"), "el tipo").toUpperCase(),
        pos: parseIntField(formData.get("pos")),
        number: parseIntField(formData.get("number")),
        amount: parseMoney(formData.get("amount")),
        vat: parseMoney(formData.get("vat")),
        legalName:
          String(formData.get("legalName") ?? "").trim() ||
          order.client.legalName?.trim() ||
          order.client.name,
        detail: String(formData.get("detail") ?? "").trim() || null,
        collected: parseMoney(formData.get("collected")),
        receiptRef: String(formData.get("receiptRef") ?? "").trim() || null,
        retVat: parseMoney(formData.get("retVat")),
        retSuss: parseMoney(formData.get("retSuss")),
        retGan: parseMoney(formData.get("retGan")),
        retIibb: parseMoney(formData.get("retIibb")),
        echeq: parseMoney(formData.get("echeq")),
        bank: parseMoney(formData.get("bank")),
        attachmentUrl: String(formData.get("attachmentUrl") ?? "").trim() || null,
        collectStatus: parseIntField(formData.get("collectStatus"), ERP_COLLECT.pending),
      },
    });
    await syncSaleOrderEstado(saleOrderId);
    if (current.saleOrderId !== saleOrderId) await syncSaleOrderEstado(current.saleOrderId);
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpSaleInvoice(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const invoice = await prisma.erpSaleInvoice.findUniqueOrThrow({
      where: { id },
      select: { saleOrderId: true, _count: { select: { receiptLinks: true } } },
    });
    if (invoice._count.receiptLinks > 0) {
      throw new Error("No se puede borrar: está en un recibo.");
    }
    await prisma.erpSaleInvoice.delete({ where: { id } });
    await syncSaleOrderEstado(invoice.saleOrderId);
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

async function purchaseInvoicePayload(formData: FormData) {
  const vendorId = requiredString(formData.get("vendorId"), "el proveedor");
  const orderId = requiredString(formData.get("orderId"), "la orden");
  const isVatPurchase = String(formData.get("isVatPurchase") ?? "") === "1";
  const issuedAt = parseDateField(formData.get("issuedAt"));
  if (!issuedAt) throw new Error("Indicá la fecha.");

  const vendor = await prisma.erpVendor.findUniqueOrThrow({
    where: { id: vendorId },
    select: { kind: true, paymentDays: true },
  });
  const purchase = await prisma.erpPurchaseOrder.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  const production = purchase
    ? null
    : await prisma.erpProductionOrder.findUnique({
        where: { id: orderId },
        select: { id: true },
      });
  if (!purchase && !production) throw new Error("No encontramos esa orden.");

  const docType = requiredString(formData.get("docType"), "el tipo").toUpperCase();

  return {
    vendor,
    purchase,
    production,
    isVatPurchase,
    data: {
      vendorId,
      issuedAt,
      dueAt: await resolveDueAt(issuedAt, vendor.paymentDays, formData.get("dueAt")),
      docType,
      pos: parseIntField(formData.get("pos")),
      number: parseIntField(formData.get("number")),
      amount: parseMoney(formData.get("amount")),
      vat: parseMoney(formData.get("vat")),
      vatWithholding: parseMoney(formData.get("vatWithholding")),
      iibbCaba: parseMoney(formData.get("iibbCaba")),
      iibbBsAs: parseMoney(formData.get("iibbBsAs")),
      isVatPurchase,
      isCreditNote: String(formData.get("isCreditNote") ?? "") === "1" || docType.startsWith("NC"),
      commission: parseMoney(formData.get("commission")),
      diegoFee: parseMoney(formData.get("diegoFee")),
      payStatus: parseIntField(formData.get("payStatus"), ERP_SETTLE.pending),
      attachmentUrl: String(formData.get("attachmentUrl") ?? "").trim() || null,
    },
  };
}

export async function createErpPurchaseInvoice(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const payload = await purchaseInvoicePayload(formData);
    const invoice = await prisma.erpPurchaseInvoice.create({
      data: {
        ...payload.data,
        orderLinks: {
          create: {
            purchaseOrderId: payload.purchase?.id ?? null,
            productionOrderId: payload.production?.id ?? null,
            vendorKind: payload.vendor.kind,
          },
        },
      },
    });
    await syncLinkedPurchaseOrders(invoice.id);
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpPurchaseInvoice(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const prevLinks = await prisma.erpPurchaseInvoiceOrder.findMany({
      where: { invoiceId: id },
      select: { purchaseOrderId: true, productionOrderId: true },
    });
    const payload = await purchaseInvoicePayload(formData);
    await prisma.$transaction([
      prisma.erpPurchaseInvoice.update({ where: { id }, data: payload.data }),
      prisma.erpPurchaseInvoiceOrder.deleteMany({ where: { invoiceId: id } }),
      prisma.erpPurchaseInvoiceOrder.create({
        data: {
          invoiceId: id,
          purchaseOrderId: payload.purchase?.id ?? null,
          productionOrderId: payload.production?.id ?? null,
          vendorKind: payload.vendor.kind,
        },
      }),
    ]);
    await syncLinkedPurchaseOrders(id);
    for (const link of prevLinks) {
      if (link.purchaseOrderId) await syncPurchaseOrderEstado(link.purchaseOrderId);
      if (link.productionOrderId) await syncProductionOrderEstado(link.productionOrderId);
    }
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpPurchaseInvoice(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const invoice = await prisma.erpPurchaseInvoice.findUniqueOrThrow({
      where: { id },
      select: {
        orderLinks: { select: { purchaseOrderId: true, productionOrderId: true } },
        _count: { select: { receiptLinks: true, paymentLinks: true } },
      },
    });
    if (invoice._count.receiptLinks + invoice._count.paymentLinks > 0) {
      throw new Error("No se puede borrar: está en un recibo o una orden de pago.");
    }
    await prisma.erpPurchaseInvoice.delete({ where: { id } });
    for (const link of invoice.orderLinks) {
      if (link.purchaseOrderId) await syncPurchaseOrderEstado(link.purchaseOrderId);
      if (link.productionOrderId) await syncProductionOrderEstado(link.productionOrderId);
    }
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpSaleReceipt(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const clientId = requiredString(formData.get("clientId"), "el cliente");
    const issuedAt = parseDateField(formData.get("issuedAt"));
    if (!issuedAt) throw new Error("Indicá la fecha.");
    const invoiceIds = formData.getAll("invoiceId").map(String).filter(Boolean);
    const receipt = await prisma.erpSaleReceipt.create({
      data: {
        clientId,
        issuedAt,
        number: parseIntField(formData.get("number")),
        amount: parseMoney(formData.get("amount")),
        balance: parseMoney(formData.get("balance")),
        invoices: { create: invoiceIds.map((invoiceId) => ({ invoiceId })) },
      },
    });

    const cheque = parseMoney(formData.get("chequeAmount"));
    if (cheque > 0) {
      await prisma.erpTreasuryPayment.create({
        data: {
          saleReceiptId: receipt.id,
          paymentKind: ERP_PAY.cheque,
          number: String(formData.get("chequeNumber") ?? "").trim() || null,
          issuedAt: parseDateField(formData.get("chequeIssuedAt")) ?? issuedAt,
          paidAt: parseDateField(formData.get("chequePaidAt")) ?? issuedAt,
          amount: cheque,
          estado: 0,
        },
      });
    }
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpSaleReceipt(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const issuedAt = parseDateField(formData.get("issuedAt"));
    if (!issuedAt) throw new Error("Indicá la fecha.");
    const invoiceIds = formData.getAll("invoiceId").map(String).filter(Boolean);
    await prisma.$transaction([
      prisma.erpSaleReceiptInvoice.deleteMany({ where: { receiptId: id } }),
      prisma.erpSaleReceipt.update({
        where: { id },
        data: {
          clientId: requiredString(formData.get("clientId"), "el cliente"),
          issuedAt,
          number: parseIntField(formData.get("number")),
          amount: parseMoney(formData.get("amount")),
          balance: parseMoney(formData.get("balance")),
          invoices: { create: invoiceIds.map((invoiceId) => ({ invoiceId })) },
        },
      }),
    ]);
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpSaleReceipt(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpTreasuryPayment.deleteMany({ where: { saleReceiptId: id } });
    await prisma.erpSaleReceipt.delete({ where: { id } });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpPaymentOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const vendorId = requiredString(formData.get("vendorId"), "el proveedor");
    const issuedAt = parseDateField(formData.get("issuedAt"));
    if (!issuedAt) throw new Error("Indicá la fecha.");
    const invoiceIds = formData.getAll("invoiceId").map(String).filter(Boolean);
    await prisma.erpPaymentOrder.create({
      data: {
        vendorId,
        issuedAt,
        number: parseIntField(formData.get("number")),
        amount: parseMoney(formData.get("amount")),
        balance: parseMoney(formData.get("balance")),
        notes: String(formData.get("notes") ?? "").trim() || null,
        invoices: { create: invoiceIds.map((invoiceId) => ({ invoiceId })) },
      },
    });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpPaymentOrder(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const id = requiredId(formData.get("id"));
    const issuedAt = parseDateField(formData.get("issuedAt"));
    if (!issuedAt) throw new Error("Indicá la fecha.");
    const invoiceIds = formData.getAll("invoiceId").map(String).filter(Boolean);
    await prisma.$transaction([
      prisma.erpPaymentOrderInvoice.deleteMany({ where: { paymentOrderId: id } }),
      prisma.erpPaymentOrder.update({
        where: { id },
        data: {
          vendorId: requiredString(formData.get("vendorId"), "el proveedor"),
          issuedAt,
          number: parseIntField(formData.get("number")),
          amount: parseMoney(formData.get("amount")),
          balance: parseMoney(formData.get("balance")),
          notes: String(formData.get("notes") ?? "").trim() || null,
          invoices: { create: invoiceIds.map((invoiceId) => ({ invoiceId })) },
        },
      }),
    ]);
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpPaymentOrder(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpPaymentOrder.delete({ where: { id } });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function createErpIssuedCheque(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    const purchaseReceiptId = String(formData.get("purchaseReceiptId") ?? "").trim() || null;
    await prisma.erpTreasuryPayment.create({
      data: {
        purchaseReceiptId,
        paymentKind: ERP_PAY.cheque,
        number: requiredString(formData.get("number"), "el número de cheque"),
        issuedAt: parseDateField(formData.get("issuedAt")),
        paidAt: parseDateField(formData.get("paidAt")),
        amount: parseMoney(formData.get("amount")),
        checkOrder: parseIntField(formData.get("checkOrder"), 0),
        checkType: parseIntField(formData.get("checkType"), 0),
        checkMode: parseIntField(formData.get("checkMode"), 0),
        estado: parseIntField(formData.get("estado"), 0),
      },
    });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function updateErpCheque(formData: FormData): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpTreasuryPayment.update({
      where: { id: requiredId(formData.get("id")) },
      data: {
        number: requiredString(formData.get("number"), "el número de cheque"),
        issuedAt: parseDateField(formData.get("issuedAt")),
        paidAt: parseDateField(formData.get("paidAt")),
        amount: parseMoney(formData.get("amount")),
        estado: parseIntField(formData.get("estado"), 0),
      },
    });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function setErpSaleCollectStatus(id: string, collectStatus: number): Promise<Result> {
  try {
    await requireOpsSession();
    const collected =
      collectStatus === ERP_COLLECT.collected
        ? (
            await prisma.erpSaleInvoice.findUniqueOrThrow({
              where: { id },
              select: { amount: true, vat: true },
            })
          )
        : null;
    await prisma.erpSaleInvoice.update({
      where: { id },
      data: {
        collectStatus,
        ...(collected
          ? { collected: Number(collected.amount) + Number(collected.vat) }
          : {}),
      },
    });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function setErpPurchasePayStatus(id: string, payStatus: number): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpPurchaseInvoice.update({ where: { id }, data: { payStatus } });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpCheque(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    await prisma.erpTreasuryPayment.delete({ where: { id } });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}
