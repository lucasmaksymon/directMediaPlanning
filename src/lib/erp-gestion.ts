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

export type GestionPurchaseBlock = {
  id: string;
  doc: string;
  vendor: string;
  issuedAt: Date;
  net: number;
  vat: number;
  iibb: number;
  percVat: number;
  diegoFee: number;
  total: number;
  payStatus: number;
};

export type GestionProductionBlock = {
  id: string;
  doc: string;
  vendor: string;
  issuedAt: Date;
  net: number;
  vat: number;
  total: number;
  payStatus: number;
};

export type GestionSaleBlock = {
  id: string;
  doc: string;
  issuedAt: Date;
  net: number;
  vat: number;
  retVat: number;
  retSuss: number;
  retGan: number;
  retIibb: number;
  total: number;
  collected: number;
  collectStatus: number;
  receiptRef: string | null;
};

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
  purchase: GestionPurchaseBlock | null;
  production: GestionProductionBlock | null;
  sale: GestionSaleBlock | null;
  /** Venta neta de retenciones − compra − producción (misma idea que el Excel / informe). */
  ganancia: number | null;
  gananciaPct: number | null;
};

/** TOTAL compra Excel col. 20: neto + IVA + IIBB + perc. IVA + com. Diego. */
export function purchaseLineTotal(p: {
  net: number;
  vat: number;
  iibb: number;
  percVat: number;
  diegoFee: number;
}) {
  return p.net + p.vat + p.iibb + p.percVat + p.diegoFee;
}

/** TOTAL producción Excel col. 31: neto + IVA. */
export function productionLineTotal(p: { net: number; vat: number }) {
  return p.net + p.vat;
}

/** TOTAL venta Excel col. 44: neto + IVA − retenciones. */
export function saleLineTotal(s: {
  net: number;
  vat: number;
  retVat: number;
  retSuss: number;
  retGan: number;
  retIibb: number;
}) {
  return s.net + s.vat - s.retVat - s.retSuss - s.retGan - s.retIibb;
}

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

    const purchaseBlock: GestionPurchaseBlock | null = purchase
      ? (() => {
          const block = {
            id: purchase.id,
            doc: invDoc(purchase),
            vendor: purchase.vendor.name,
            issuedAt: purchase.issuedAt,
            net: n(purchase.amount),
            vat: n(purchase.vat),
            iibb: n(purchase.iibbCaba) + n(purchase.iibbBsAs),
            percVat: n(purchase.vatWithholding),
            diegoFee: n(purchase.diegoFee),
            payStatus: purchase.payStatus,
          };
          return { ...block, total: purchaseLineTotal(block) };
        })()
      : null;

    const productionBlock: GestionProductionBlock | null = production
      ? (() => {
          const block = {
            id: production.id,
            doc: invDoc(production),
            vendor: production.vendor.name,
            issuedAt: production.issuedAt,
            net: n(production.amount),
            vat: n(production.vat),
            payStatus: production.payStatus,
          };
          return { ...block, total: productionLineTotal(block) };
        })()
      : null;

    const saleBlock: GestionSaleBlock | null = sale
      ? (() => {
          const block = {
            id: sale.id,
            doc: `${sale.docType} ${sale.pos}-${sale.number}`,
            issuedAt: sale.issuedAt,
            net: n(sale.amount),
            vat: n(sale.vat),
            retVat: n(sale.retVat),
            retSuss: n(sale.retSuss),
            retGan: n(sale.retGan),
            retIibb: n(sale.retIibb),
            collected: n(sale.collected),
            collectStatus: sale.collectStatus,
            receiptRef: sale.receiptRef,
          };
          return { ...block, total: saleLineTotal(block) };
        })()
      : null;

    const hasMoney = Boolean(purchaseBlock || productionBlock || saleBlock);
    const ganancia = hasMoney
      ? (saleBlock?.total ?? 0) - (purchaseBlock?.total ?? 0) - (productionBlock?.total ?? 0)
      : null;
    const gananciaPct =
      ganancia != null && saleBlock && saleBlock.total !== 0 ? (ganancia * 100) / saleBlock.total : null;

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
      purchase: purchaseBlock,
      production: productionBlock,
      sale: saleBlock,
      ganancia,
      gananciaPct,
    });
  }
  return rows;
}

/** Arma filas de GESTIÓN desde órdenes + facturas (ADMINISTRACION no trae esa planilla). */
export async function rebuildGestionLinesFromOrders() {
  await prisma.erpGestionLine.deleteMany();
  const orders = await prisma.erpSaleOrder.findMany({
    orderBy: { issuedAt: "asc" },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      invoices: { orderBy: [{ issuedAt: "asc" }, { number: "asc" }] },
      purchaseOrders: {
        include: {
          invoiceLinks: { include: { invoice: { select: { id: true } } } },
        },
      },
      productionOrders: {
        include: {
          invoiceLinks: { include: { invoice: { select: { id: true } } } },
        },
      },
    },
  });

  const rows: {
    saleOrderId: string;
    sort: number;
    element: string | null;
    location: string | null;
    quantity: number;
    startsAt: Date | null;
    endsAt: Date | null;
    purchaseInvoiceId: string | null;
    productionInvoiceId: string | null;
    saleInvoiceId: string | null;
  }[] = [];

  for (const order of orders) {
    const purchases = uniqueIds(
      order.purchaseOrders.flatMap((po) => po.invoiceLinks.map((l) => l.invoice.id)),
    );
    const productions = uniqueIds(
      order.productionOrders.flatMap((po) => po.invoiceLinks.map((l) => l.invoice.id)),
    );
    const sales = order.invoices.map((inv) => inv.id);
    const count = Math.max(1, order.items.length, purchases.length, productions.length, sales.length);
    for (let i = 0; i < count; i += 1) {
      const item = order.items[i];
      rows.push({
        saleOrderId: order.id,
        sort: i,
        element: item?.element ?? null,
        location: item?.location ?? null,
        quantity: item ? n(item.quantity) : 0,
        startsAt: item?.startsAt ?? null,
        endsAt: item?.endsAt ?? null,
        purchaseInvoiceId: purchases[i] ?? null,
        productionInvoiceId: productions[i] ?? null,
        saleInvoiceId: sales[i] ?? null,
      });
    }
  }

  const chunk = 400;
  let created = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const res = await prisma.erpGestionLine.createMany({ data: part });
    created += res.count;
  }
  return created;
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
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
