import { prisma } from "@/lib/prisma";
import { ERP_COLLECT, ERP_SETTLE, ERP_VENDOR } from "@/lib/erp";

export type GestionFilter = {
  month?: number;
  year?: number;
  q?: string;
  sale?: "all" | "to_invoice" | "pending" | "collected";
  pay?: "all" | "pending" | "paid";
};

export type GestionRow = {
  id: string;
  number: string;
  month: number;
  year: number;
  issuedAt: Date;
  client: string;
  legalName: string | null;
  items: { element: string; location: string | null; quantity: number }[];
  purchaseNet: number;
  purchasePending: number;
  productionNet: number;
  saleNet: number;
  saleVat: number;
  saleCollected: number;
  saleStatus: "A facturar" | "Pendiente" | "Cobrado";
  payStatus: "—" | "Pendiente" | "Pagado";
};

function n(v: { toString(): string } | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export async function loadGestion(filter: GestionFilter): Promise<GestionRow[]> {
  const year = filter.year ?? new Date().getFullYear();
  const orders = await prisma.erpSaleOrder.findMany({
    where: {
      year,
      ...(filter.month ? { month: filter.month } : {}),
      ...(filter.q
        ? {
            OR: [
              { number: { contains: filter.q, mode: "insensitive" } },
              { client: { name: { contains: filter.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ month: "asc" }, { number: "asc" }],
    include: {
      client: { select: { name: true, legalName: true } },
      items: { orderBy: { createdAt: "asc" } },
      invoices: true,
      purchaseOrders: {
        include: {
          invoiceLinks: { include: { invoice: true } },
        },
      },
      productionOrders: {
        include: {
          invoiceLinks: { include: { invoice: true } },
        },
      },
    },
  });

  const rows: GestionRow[] = [];
  for (const order of orders) {
    let purchaseNet = 0;
    let purchasePending = 0;
    let hasPurchase = false;
    for (const po of order.purchaseOrders) {
      for (const link of po.invoiceLinks) {
        if (link.invoice.isVatPurchase) continue;
        if (link.vendorKind === ERP_VENDOR.producer) continue;
        hasPurchase = true;
        purchaseNet += n(link.invoice.amount);
        if (link.invoice.payStatus !== ERP_SETTLE.paid) {
          purchasePending += n(link.invoice.amount) + n(link.invoice.vat);
        }
      }
    }

    let productionNet = 0;
    for (const prod of order.productionOrders) {
      for (const link of prod.invoiceLinks) {
        productionNet += n(link.invoice.amount);
        hasPurchase = true;
        if (link.invoice.payStatus !== ERP_SETTLE.paid) {
          purchasePending += n(link.invoice.amount) + n(link.invoice.vat);
        }
      }
    }

    let saleNet = 0;
    let saleVat = 0;
    let saleCollected = 0;
    let allCollected = order.invoices.length > 0;
    for (const inv of order.invoices) {
      saleNet += n(inv.amount);
      saleVat += n(inv.vat);
      saleCollected += n(inv.collected);
      if (inv.collectStatus !== ERP_COLLECT.collected) allCollected = false;
    }

    const saleStatus: GestionRow["saleStatus"] = !order.invoices.length
      ? "A facturar"
      : allCollected
        ? "Cobrado"
        : "Pendiente";
    const payStatus: GestionRow["payStatus"] = !hasPurchase
      ? "—"
      : purchasePending > 0.009
        ? "Pendiente"
        : "Pagado";

    if (filter.sale === "to_invoice" && saleStatus !== "A facturar") continue;
    if (filter.sale === "pending" && saleStatus !== "Pendiente") continue;
    if (filter.sale === "collected" && saleStatus !== "Cobrado") continue;
    if (filter.pay === "pending" && payStatus !== "Pendiente") continue;
    if (filter.pay === "paid" && payStatus !== "Pagado") continue;

    rows.push({
      id: order.id,
      number: order.number,
      month: order.month,
      year: order.year,
      issuedAt: order.issuedAt,
      client: order.client.name,
      legalName: order.client.legalName,
      items: order.items.map((i) => ({
        element: i.element,
        location: i.location,
        quantity: n(i.quantity),
      })),
      purchaseNet,
      purchasePending,
      productionNet,
      saleNet,
      saleVat,
      saleCollected,
      saleStatus,
      payStatus,
    });
  }
  return rows;
}

export type GestionLineRow = {
  id: string;
  orderId: string;
  number: string;
  month: number;
  year: number;
  client: string;
  legalName: string | null;
  element: string | null;
  location: string | null;
  quantity: number;
  startsAt: Date | null;
  endsAt: Date | null;
  purchase: {
    id: string;
    doc: string;
    vendor: string;
    net: number;
    vat: number;
    iibb: number;
    percVat: number;
    diegoFee: number;
    payStatus: number;
  } | null;
  production: {
    id: string;
    doc: string;
    vendor: string;
    net: number;
    payStatus: number;
  } | null;
  sale: {
    id: string;
    doc: string;
    net: number;
    vat: number;
    collected: number;
    collectStatus: number;
    receiptRef: string | null;
  } | null;
};

function invDoc(inv: { isCreditNote?: boolean; docType: string; pos: number; number: number }) {
  return `${inv.isCreditNote ? "NC" : inv.docType} ${inv.pos}-${inv.number}`;
}

export async function loadGestionLines(filter: GestionFilter): Promise<GestionLineRow[]> {
  const year = filter.year ?? new Date().getFullYear();
  const lines = await prisma.erpGestionLine.findMany({
    where: {
      saleOrder: {
        year,
        ...(filter.month ? { month: filter.month } : {}),
        ...(filter.q
          ? {
              OR: [
                { number: { contains: filter.q, mode: "insensitive" } },
                { client: { name: { contains: filter.q, mode: "insensitive" } } },
                { items: { some: { element: { contains: filter.q, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
    },
    orderBy: [{ saleOrder: { month: "asc" } }, { saleOrder: { number: "asc" } }, { sort: "asc" }],
    include: {
      saleOrder: { select: { id: true, number: true, month: true, year: true, client: { select: { name: true, legalName: true } } } },
      purchaseInvoice: { include: { vendor: { select: { name: true } } } },
      productionInvoice: { include: { vendor: { select: { name: true } } } },
      saleInvoice: true,
    },
  });

  const rows: GestionLineRow[] = [];
  for (const line of lines) {
    const purchase = line.purchaseInvoice;
    const production = line.productionInvoice;
    const sale = line.saleInvoice;
    const saleStatus = !sale ? "A facturar" : sale.collectStatus === ERP_COLLECT.collected ? "Cobrado" : "Pendiente";
    const payBits = [purchase, production].filter(Boolean);
    const payStatus = !payBits.length
      ? "—"
      : payBits.some((i) => i && i.payStatus !== ERP_SETTLE.paid)
        ? "Pendiente"
        : "Pagado";
    if (filter.sale === "to_invoice" && saleStatus !== "A facturar") continue;
    if (filter.sale === "pending" && saleStatus !== "Pendiente") continue;
    if (filter.sale === "collected" && saleStatus !== "Cobrado") continue;
    if (filter.pay === "pending" && payStatus !== "Pendiente") continue;
    if (filter.pay === "paid" && payStatus !== "Pagado") continue;

    rows.push({
      id: line.id,
      orderId: line.saleOrder.id,
      number: line.saleOrder.number,
      month: line.saleOrder.month,
      year: line.saleOrder.year,
      client: line.saleOrder.client.name,
      legalName: line.saleOrder.client.legalName,
      element: line.element,
      location: line.location,
      quantity: n(line.quantity),
      startsAt: line.startsAt,
      endsAt: line.endsAt,
      purchase: purchase
        ? {
            id: purchase.id,
            doc: invDoc(purchase),
            vendor: purchase.vendor.name,
            net: n(purchase.amount),
            vat: n(purchase.vat),
            iibb: n(purchase.iibbCaba),
            percVat: n(purchase.vatWithholding),
            diegoFee: n(purchase.diegoFee),
            payStatus: purchase.payStatus,
          }
        : null,
      production: production
        ? {
            id: production.id,
            doc: invDoc(production),
            vendor: production.vendor.name,
            net: n(production.amount),
            payStatus: production.payStatus,
          }
        : null,
      sale: sale
        ? {
            id: sale.id,
            doc: `${sale.docType} ${sale.pos}-${sale.number}`,
            net: n(sale.amount),
            vat: n(sale.vat),
            collected: n(sale.collected),
            collectStatus: sale.collectStatus,
            receiptRef: sale.receiptRef,
          }
        : null,
    });
  }
  return rows;
}

export async function loadPendingPayables() {
  const invoices = await prisma.erpPurchaseInvoice.findMany({
    where: { payStatus: ERP_SETTLE.pending },
    orderBy: { dueAt: "asc" },
    include: {
      vendor: { select: { name: true } },
      orderLinks: {
        include: {
          purchaseOrder: { select: { number: true, saleOrder: { select: { number: true } } } },
          productionOrder: { select: { number: true, saleOrder: { select: { number: true } } } },
        },
      },
    },
  });
  const now = new Date();
  return invoices.map((inv) => {
    const total = n(inv.amount) + n(inv.vat);
    const link = inv.orderLinks[0];
    const order =
      link?.purchaseOrder?.saleOrder.number ?? link?.productionOrder?.saleOrder.number ?? "—";
    return {
      id: inv.id,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      overdue: inv.dueAt < now,
      doc: `${inv.isCreditNote ? "NC" : inv.docType} ${inv.pos}-${inv.number}`,
      vendor: inv.vendor.name,
      order,
      amount: total,
    };
  });
}
