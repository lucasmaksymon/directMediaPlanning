"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireOpsSession } from "@/lib/ops-access";
import {
  ERP_CHECK_DEFERRED,
  ERP_COLLECT,
  ERP_PAY,
  ERP_PAY_PURCHASE_CHEQUE,
  ERP_PAY_PURCHASE_KIND,
  ERP_PAY_STATUS,
  ERP_SETTLE,
  optionalString,
  parseDateField,
  parseIntField,
  parseMoney,
  requiredString,
} from "@/lib/erp";
import { parseFormLines } from "@/lib/erp-form-lines";

const RECEIPT_PAY_FIELDS = [
  "paymentKind",
  "number",
  "issuedAt",
  "paidAt",
  "checkOrder",
  "checkType",
  "checkMode",
  "amount",
  "estado",
  "attachmentUrl",
  "endorsedFromId",
] as const;

function receiptPaymentsFromForm(formData: FormData, chequeKinds: readonly number[] = [ERP_PAY.cheque]) {
  return parseFormLines(formData, "py", [...RECEIPT_PAY_FIELDS])
    .filter((line) => line.values.amount || line.values.number || line.values.paymentKind)
    .map((line) => {
      const paymentKind = parseIntField(line.values.paymentKind, ERP_PAY.transfer);
      const isCheque = chequeKinds.includes(paymentKind);
      return {
        id: line.id,
        paymentKind,
        number: optionalString(line.values.number),
        issuedAt: parseDateField(line.values.issuedAt),
        paidAt: parseDateField(line.values.paidAt),
        checkOrder: isCheque ? parseIntField(line.values.checkOrder, 0) : 0,
        checkType: isCheque ? parseIntField(line.values.checkType, 0) : 0,
        checkMode: isCheque ? parseIntField(line.values.checkMode, 0) : 0,
        amount: parseMoney(line.values.amount),
        estado: parseIntField(line.values.estado, 0),
        attachmentUrl: optionalString(line.values.attachmentUrl),
        endorsedFromId: optionalString(line.values.endorsedFromId),
      };
    })
    .filter((row) => row.amount > 0 || row.number || row.endorsedFromId);
}

function paymentCreateData(line: ReturnType<typeof receiptPaymentsFromForm>[number]) {
  return {
    paymentKind: line.paymentKind,
    number: line.number,
    issuedAt: line.issuedAt,
    paidAt: line.paidAt,
    checkOrder: line.checkOrder,
    checkType: line.checkType,
    checkMode: line.checkMode,
    amount: line.amount,
    estado: line.estado,
    attachmentUrl: line.attachmentUrl,
    endorsedFromId: line.endorsedFromId,
  };
}

type PayLine = ReturnType<typeof receiptPaymentsFromForm>[number];
type Db = Prisma.TransactionClient | typeof prisma;

async function releaseEndorsedSources(tx: Db, ids: Array<string | null | undefined>) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return;
  await tx.erpTreasuryPayment.updateMany({
    where: { id: { in: unique } },
    data: { estado: ERP_PAY_STATUS.pending },
  });
}

async function hydratePurchasePayLine(tx: Db, line: PayLine, previousSourceId: string | null) {
  const data = paymentCreateData(line);
  if (line.paymentKind !== ERP_PAY_PURCHASE_KIND.endorsed) {
    return { ...data, endorsedFromId: null };
  }
  const sourceId = line.endorsedFromId;
  if (!sourceId) throw new Error("Seleccioná el cheque a endosar.");
  const source = await tx.erpTreasuryPayment.findUnique({ where: { id: sourceId } });
  if (!source?.saleReceiptId || source.paymentKind !== ERP_PAY.cheque) {
    throw new Error("El cheque ya ha sido endosado o no existe");
  }
  if (source.checkOrder === ERP_CHECK_DEFERRED) {
    throw new Error("No se puede endosar un cheque diferido.");
  }
  if (source.estado !== ERP_PAY_STATUS.pending && source.id !== previousSourceId) {
    throw new Error("El cheque ya ha sido endosado o no existe");
  }
  return {
    ...data,
    number: source.number,
    issuedAt: source.issuedAt,
    paidAt: source.paidAt,
    checkOrder: source.checkOrder,
    checkType: source.checkType,
    checkMode: source.checkMode,
    endorsedFromId: source.id,
  };
}
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
        net: true,
        vat: true,
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
    const amount = parseMoney(formData.get("amount")) || Number(order.net);
    const vat = parseMoney(formData.get("vat")) || Number(order.vat);
    await prisma.erpSaleInvoice.create({
      data: {
        client: { connect: { id: order.clientId } },
        saleOrder: { connect: { id: saleOrderId } },
        issuedAt,
        dueAt: await resolveDueAt(issuedAt, order.client.company.paymentDays, formData.get("dueAt")),
        docType: requiredString(formData.get("docType"), "el tipo").toUpperCase(),
        pos: parseIntField(formData.get("pos")),
        number: parseIntField(formData.get("number")),
        amount,
        vat,
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
        net: true,
        vat: true,
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
    const amount = parseMoney(formData.get("amount")) || Number(order.net);
    const vat = parseMoney(formData.get("vat")) || Number(order.vat);
    await prisma.erpSaleInvoice.update({
      where: { id },
      data: {
        client: { connect: { id: order.clientId } },
        saleOrder: { connect: { id: saleOrderId } },
        amount,
        vat,
        issuedAt,
        dueAt: await resolveDueAt(issuedAt, order.client.company.paymentDays, formData.get("dueAt")),
        docType: requiredString(formData.get("docType"), "el tipo").toUpperCase(),
        pos: parseIntField(formData.get("pos")),
        number: parseIntField(formData.get("number")),
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
    const payments = receiptPaymentsFromForm(formData).map(paymentCreateData);
    await prisma.erpSaleReceipt.create({
      data: {
        clientId,
        issuedAt,
        number: parseIntField(formData.get("number")),
        amount: parseMoney(formData.get("amount")),
        balance: parseMoney(formData.get("balance")),
        invoices: { create: invoiceIds.map((invoiceId) => ({ invoiceId })) },
        payments: payments.length ? { create: payments } : undefined,
      },
    });
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
    const lines = receiptPaymentsFromForm(formData);
    const keep = lines.map((l) => l.id).filter((lineId): lineId is string => Boolean(lineId));
    await prisma.$transaction(async (tx) => {
      await tx.erpSaleReceipt.update({
        where: { id },
        data: {
          clientId: requiredString(formData.get("clientId"), "el cliente"),
          issuedAt,
          number: parseIntField(formData.get("number")),
          amount: parseMoney(formData.get("amount")),
          balance: parseMoney(formData.get("balance")),
        },
      });
      await tx.erpSaleReceiptInvoice.deleteMany({ where: { receiptId: id } });
      if (invoiceIds.length) {
        await tx.erpSaleReceiptInvoice.createMany({
          data: invoiceIds.map((invoiceId) => ({ receiptId: id, invoiceId })),
        });
      }
      await tx.erpTreasuryPayment.deleteMany({
        where: { saleReceiptId: id, ...(keep.length ? { id: { notIn: keep } } : {}) },
      });
      for (const line of lines) {
        const { id: lineId, ...row } = line;
        if (lineId) await tx.erpTreasuryPayment.update({ where: { id: lineId }, data: row });
        else await tx.erpTreasuryPayment.create({ data: { saleReceiptId: id, ...row } });
      }
    });
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
    const lines = receiptPaymentsFromForm(formData, ERP_PAY_PURCHASE_CHEQUE);
    await prisma.$transaction(async (tx) => {
      const used = new Set<string>();
      const payments = [];
      for (const line of lines) {
        const row = await hydratePurchasePayLine(tx, line, null);
        if (row.endorsedFromId) {
          if (used.has(row.endorsedFromId)) throw new Error("El cheque ya ha sido endosado o no existe");
          used.add(row.endorsedFromId);
        }
        payments.push(row);
      }
      await tx.erpPaymentOrder.create({
        data: {
          vendorId,
          issuedAt,
          number: parseIntField(formData.get("number")),
          amount: parseMoney(formData.get("amount")),
          balance: parseMoney(formData.get("balance")),
          notes: String(formData.get("notes") ?? "").trim() || null,
          invoices: { create: invoiceIds.map((invoiceId) => ({ invoiceId })) },
          treasury: payments.length ? { create: payments } : undefined,
        },
      });
      if (used.size) {
        await tx.erpTreasuryPayment.updateMany({
          where: { id: { in: [...used] } },
          data: { estado: ERP_PAY_STATUS.done },
        });
      }
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
    const lines = receiptPaymentsFromForm(formData, ERP_PAY_PURCHASE_CHEQUE);
    const keep = lines.map((l) => l.id).filter((lineId): lineId is string => Boolean(lineId));
    await prisma.$transaction(async (tx) => {
      const existing = await tx.erpTreasuryPayment.findMany({
        where: { paymentOrderId: id },
        select: { id: true, endorsedFromId: true },
      });
      const existingById = new Map(existing.map((row) => [row.id, row.endorsedFromId]));
      const removedSources = existing
        .filter((row) => !keep.includes(row.id))
        .map((row) => row.endorsedFromId);
      const nextSources: string[] = [];
      const used = new Set<string>();
      const prepared = [];
      for (const line of lines) {
        const previous = line.id ? existingById.get(line.id) ?? null : null;
        const row = await hydratePurchasePayLine(tx, line, previous);
        if (row.endorsedFromId) {
          if (used.has(row.endorsedFromId)) throw new Error("El cheque ya ha sido endosado o no existe");
          used.add(row.endorsedFromId);
          nextSources.push(row.endorsedFromId);
        }
        prepared.push({ id: line.id, row });
      }
      await tx.erpPaymentOrder.update({
        where: { id },
        data: {
          vendorId: requiredString(formData.get("vendorId"), "el proveedor"),
          issuedAt,
          number: parseIntField(formData.get("number")),
          amount: parseMoney(formData.get("amount")),
          balance: parseMoney(formData.get("balance")),
          notes: String(formData.get("notes") ?? "").trim() || null,
        },
      });
      await tx.erpPaymentOrderInvoice.deleteMany({ where: { paymentOrderId: id } });
      if (invoiceIds.length) {
        await tx.erpPaymentOrderInvoice.createMany({
          data: invoiceIds.map((invoiceId) => ({ paymentOrderId: id, invoiceId })),
        });
      }
      await tx.erpTreasuryPayment.deleteMany({
        where: { paymentOrderId: id, ...(keep.length ? { id: { notIn: keep } } : {}) },
      });
      for (const item of prepared) {
        if (item.id) await tx.erpTreasuryPayment.update({ where: { id: item.id }, data: item.row });
        else await tx.erpTreasuryPayment.create({ data: { paymentOrderId: id, ...item.row } });
      }
      const released = [
        ...removedSources,
        ...existing.map((row) => row.endorsedFromId).filter((sourceId) => sourceId && !used.has(sourceId)),
      ];
      await releaseEndorsedSources(tx, released);
      if (nextSources.length) {
        await tx.erpTreasuryPayment.updateMany({
          where: { id: { in: nextSources } },
          data: { estado: ERP_PAY_STATUS.done },
        });
      }
    });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}

export async function deleteErpPaymentOrder(id: string): Promise<Result> {
  try {
    await requireOpsSession();
    const sources = await prisma.erpTreasuryPayment.findMany({
      where: { paymentOrderId: id, endorsedFromId: { not: null } },
      select: { endorsedFromId: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.erpTreasuryPayment.deleteMany({ where: { paymentOrderId: id } });
      await releaseEndorsedSources(
        tx,
        sources.map((row) => row.endorsedFromId),
      );
      await tx.erpPaymentOrder.delete({ where: { id } });
    });
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
        attachmentUrl: optionalString(String(formData.get("attachmentUrl") ?? "")),
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
    const id = requiredId(formData.get("id"));
    const current = await prisma.erpTreasuryPayment.findUnique({ where: { id } });
    if (!current) throw new Error("El cheque no existe.");
    const endorsed = await prisma.erpTreasuryPayment.findFirst({
      where: { endorsedFromId: id },
      select: { id: true },
    });
    let estado = parseIntField(formData.get("estado"), 0);
    if (endorsed && estado === ERP_PAY_STATUS.pending) {
      estado = ERP_PAY_STATUS.done;
    }
    await prisma.erpTreasuryPayment.update({
      where: { id },
      data: {
        number: requiredString(formData.get("number"), "el número de cheque"),
        issuedAt: parseDateField(formData.get("issuedAt")),
        paidAt: parseDateField(formData.get("paidAt")),
        amount: parseMoney(formData.get("amount")),
        estado,
        attachmentUrl: optionalString(String(formData.get("attachmentUrl") ?? "")),
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
    const row = await prisma.erpTreasuryPayment.findUnique({ where: { id } });
    if (!row) throw new Error("El cheque no existe.");
    const endorsed = await prisma.erpTreasuryPayment.findFirst({
      where: { endorsedFromId: id },
      select: { id: true },
    });
    if (endorsed) throw new Error("El cheque está endosado en una orden de pago.");
    await prisma.$transaction(async (tx) => {
      if (row.endorsedFromId) {
        await releaseEndorsedSources(tx, [row.endorsedFromId]);
      }
      await tx.erpTreasuryPayment.delete({ where: { id } });
    });
    refreshBilling();
    return { ok: true };
  } catch (e) {
    return erpFail(e);
  }
}
