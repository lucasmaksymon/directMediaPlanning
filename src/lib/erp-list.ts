import { prisma } from "@/lib/prisma";
import { ERP_ORDER } from "@/lib/erp";

export const ERP_LIST_TAKE = 200;
export const ERP_PICK_TAKE = 80;

const salePickSelect = {
  id: true,
  number: true,
  estado: true,
  amount: true,
  net: true,
  vat: true,
  clientId: true,
  client: { select: { name: true, legalName: true } },
} as const;

const purchasePickSelect = {
  id: true,
  number: true,
  estado: true,
  amount: true,
  vendorId: true,
  vendor: { select: { name: true } },
  saleOrder: { select: { number: true } },
} as const;

const productionPickSelect = {
  id: true,
  number: true,
  estado: true,
  amount: true,
  vendorId: true,
  vendor: { select: { name: true } },
  saleOrder: { select: { number: true } },
} as const;

export function listSaleOrdersForTable() {
  return prisma.erpSaleOrder.findMany({
    orderBy: { issuedAt: "desc" },
    take: ERP_LIST_TAKE,
    select: {
      id: true,
      number: true,
      product: true,
      month: true,
      year: true,
      issuedAt: true,
      amount: true,
      estado: true,
      cashPayment: true,
      client: { select: { name: true } },
      items: { select: { element: true } },
    },
  });
}

export function listPurchaseOrdersForTable() {
  return prisma.erpPurchaseOrder.findMany({
    orderBy: { issuedAt: "desc" },
    take: ERP_LIST_TAKE,
    select: {
      id: true,
      number: true,
      product: true,
      issuedAt: true,
      amount: true,
      estado: true,
      cashPayment: true,
      vendor: { select: { name: true } },
      saleOrder: { select: { number: true, product: true, client: { select: { name: true } } } },
    },
  });
}

export function listProductionOrdersForTable() {
  return prisma.erpProductionOrder.findMany({
    orderBy: { issuedAt: "desc" },
    take: ERP_LIST_TAKE,
    select: {
      id: true,
      number: true,
      product: true,
      issuedAt: true,
      amount: true,
      estado: true,
      cashPayment: true,
      vendor: { select: { name: true } },
      saleOrder: { select: { number: true, product: true, client: { select: { name: true } } } },
    },
  });
}

export function listSaleOrdersForPick() {
  return prisma.erpSaleOrder.findMany({
    orderBy: { issuedAt: "desc" },
    take: ERP_PICK_TAKE,
    select: { id: true, number: true, client: { select: { name: true } } },
  });
}

const saleInvoicePickSelect = {
  ...salePickSelect,
  invoices: { select: { amount: true, vat: true } },
} as const;

/** Emitidas y facturadas: una O.P. puede tener varias facturas (p. ej. un show cada una). */
export async function listOpenSaleOrdersForPick(keepId?: string) {
  const [issued, invoiced] = await Promise.all([
    prisma.erpSaleOrder.findMany({
      where: keepId
        ? { OR: [{ estado: ERP_ORDER.issued }, { id: keepId }] }
        : { estado: ERP_ORDER.issued },
      orderBy: { issuedAt: "desc" },
      select: saleInvoicePickSelect,
    }),
    prisma.erpSaleOrder.findMany({
      where: {
        estado: ERP_ORDER.invoiced,
        ...(keepId ? { id: { not: keepId } } : {}),
      },
      orderBy: { issuedAt: "desc" },
      select: saleInvoicePickSelect,
    }),
  ]);
  return [...issued, ...invoiced];
}

/** Emitidas y facturadas: hace falta la facturada para cargar una NC (p. ej. confidencial). */
export async function listOpenPurchaseOrdersForPick(keepId?: string) {
  const [issued, invoiced] = await Promise.all([
    prisma.erpPurchaseOrder.findMany({
      where: keepId
        ? { OR: [{ estado: ERP_ORDER.issued }, { id: keepId }] }
        : { estado: ERP_ORDER.issued },
      orderBy: { issuedAt: "desc" },
      take: ERP_PICK_TAKE,
      select: purchasePickSelect,
    }),
    prisma.erpPurchaseOrder.findMany({
      where: {
        estado: ERP_ORDER.invoiced,
        ...(keepId ? { id: { not: keepId } } : {}),
      },
      orderBy: { issuedAt: "desc" },
      take: ERP_PICK_TAKE,
      select: purchasePickSelect,
    }),
  ]);
  return [...issued, ...invoiced];
}

export async function listOpenProductionOrdersForPick(keepId?: string) {
  const [issued, invoiced] = await Promise.all([
    prisma.erpProductionOrder.findMany({
      where: keepId
        ? { OR: [{ estado: ERP_ORDER.issued }, { id: keepId }] }
        : { estado: ERP_ORDER.issued },
      orderBy: { issuedAt: "desc" },
      take: ERP_PICK_TAKE,
      select: productionPickSelect,
    }),
    prisma.erpProductionOrder.findMany({
      where: {
        estado: ERP_ORDER.invoiced,
        ...(keepId ? { id: { not: keepId } } : {}),
      },
      orderBy: { issuedAt: "desc" },
      take: ERP_PICK_TAKE,
      select: productionPickSelect,
    }),
  ]);
  return [...issued, ...invoiced];
}

export function listRecentPurchaseOrdersForPick() {
  return prisma.erpPurchaseOrder.findMany({
    orderBy: { issuedAt: "desc" },
    take: ERP_PICK_TAKE,
    select: purchasePickSelect,
  });
}

export function listRecentProductionOrdersForPick() {
  return prisma.erpProductionOrder.findMany({
    orderBy: { issuedAt: "desc" },
    take: ERP_PICK_TAKE,
    select: productionPickSelect,
  });
}

export function listActiveClients() {
  return prisma.erpClient.findMany({
    where: { estado: 1 },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function listActiveVendors(kind?: number) {
  return prisma.erpVendor.findMany({
    where: { estado: 1, ...(kind == null ? {} : { kind }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
