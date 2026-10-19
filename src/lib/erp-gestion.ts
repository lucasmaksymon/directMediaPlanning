import { prisma } from "@/lib/prisma";
import {
  ERP_COLLECT,
  ERP_ORDER,
  ERP_PAY,
  ERP_SETTLE,
  ERP_VENDOR,
  erpInvoiceRef,
  erpPurchaseInvoiceTotal,
  saleOrderInvoiceCover,
  saleOrderRemaining,
} from "@/lib/erp";

export type GestionFilter = {
  month?: number;
  year?: number;
  q?: string;
  sale?: "all" | "to_invoice" | "pending" | "collected";
  pay?: "all" | "pending" | "paid";
};

export type GestionSaleStatus = "A facturar" | "Pendiente" | "Cobrado";
export type GestionPayStatus = "—" | "Sin facturar" | "Pendiente" | "Pagado";

export type GestionDetailLine = {
  id: string;
  kind: "Venta" | "Compra" | "Compra IVA" | "Producción";
  order: string;
  party: string;
  doc: string | null;
  issuedAt: Date | null;
  net: number;
  total: number;
  status: "Cobrado" | "Pagado" | "Pendiente" | "Sin factura";
  href: string;
};

export type GestionOrderRow = {
  id: string;
  number: string;
  month: number;
  year: number;
  issuedAt: Date;
  client: string;
  product: string | null;
  elements: string;
  saleNet: number;
  purchaseNet: number;
  ganancia: number;
  gananciaPct: number | null;
  /** null si ninguna factura de la orden está cobrada. */
  retenciones: number | null;
  gananciaNeta: number;
  invoiced: number;
  saleStatus: GestionSaleStatus;
  payStatus: GestionPayStatus;
  details: GestionDetailLine[];
};

function n(v: { toString(): string } | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

const WITHHOLDING_KINDS = new Set<number>([
  ERP_PAY.retVat,
  ERP_PAY.retIibb,
  ERP_PAY.retIibbAlt,
  ERP_PAY.retGan,
  ERP_PAY.retSuss,
]);

/** Retención de un pago de recibo. Transferencia, cheque y efectivo no cuentan. */
export function receiptWithholding(paymentKind: number, amount: number) {
  return WITHHOLDING_KINDS.has(paymentKind) ? amount : 0;
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

const purchaseInvoiceSelect = {
  id: true,
  docType: true,
  pos: true,
  number: true,
  issuedAt: true,
  amount: true,
  vat: true,
  vatWithholding: true,
  iibbCaba: true,
  iibbBsAs: true,
  internalTax: true,
  nonTaxable: true,
  isVatPurchase: true,
  payStatus: true,
} as const;

/**
 * GESTIÓN en vivo: una fila por O.P. de venta del período, con sus facturas de venta
 * y las órdenes de compra / producción (con o sin factura) como detalle.
 */
export async function loadGestionOrders(filter: GestionFilter): Promise<GestionOrderRow[]> {
  await reconcileSaleCollectStatus();
  const year = filter.year ?? new Date().getFullYear();
  const orders = await prisma.erpSaleOrder.findMany({
    where: {
      year,
      ...(filter.month ? { month: filter.month } : {}),
      ...(filter.q
        ? {
            OR: [
              { number: { contains: filter.q, mode: "insensitive" } },
              { product: { contains: filter.q, mode: "insensitive" } },
              { client: { name: { contains: filter.q, mode: "insensitive" } } },
              { items: { some: { element: { contains: filter.q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ month: "asc" }, { number: "asc" }],
    include: {
      client: { select: { name: true } },
      items: { select: { element: true }, orderBy: { createdAt: "asc" } },
      invoices: {
        orderBy: [{ issuedAt: "asc" }, { number: "asc" }],
        include: {
          receiptLinks: {
            select: {
              receiptId: true,
              receipt: { select: { payments: { select: { paymentKind: true, amount: true } } } },
            },
          },
        },
      },
      purchaseOrders: {
        orderBy: { number: "asc" },
        include: {
          vendor: { select: { name: true } },
          invoiceLinks: { include: { invoice: { select: purchaseInvoiceSelect } } },
        },
      },
      productionOrders: {
        orderBy: { number: "asc" },
        include: {
          vendor: { select: { name: true } },
          invoiceLinks: { include: { invoice: { select: purchaseInvoiceSelect } } },
        },
      },
    },
  });

  const rows: GestionOrderRow[] = [];
  for (const order of orders) {
    const details: GestionDetailLine[] = [];

    let invoiced = 0;
    let allCollected = order.invoices.length > 0;
    let anyCollected = false;
    let retencionesSum = 0;
    const seenWithholding = new Set<string>();
    for (const inv of order.invoices) {
      const total = saleLineTotal({
        net: n(inv.amount),
        vat: n(inv.vat),
        retVat: n(inv.retVat),
        retSuss: n(inv.retSuss),
        retGan: n(inv.retGan),
        retIibb: n(inv.retIibb),
      });
      invoiced += total;
      const collected = inv.collectStatus === ERP_COLLECT.collected;
      if (!collected) allCollected = false;
      else {
        anyCollected = true;
        for (const link of inv.receiptLinks) {
          for (const pay of link.receipt.payments) {
            const amount = receiptWithholding(pay.paymentKind, n(pay.amount));
            if (!amount) continue;
            const key = `${link.receiptId}:${pay.paymentKind}`;
            if (seenWithholding.has(key)) continue;
            seenWithholding.add(key);
            retencionesSum += amount;
          }
        }
      }
      details.push({
        id: `sale-${inv.id}`,
        kind: "Venta",
        order: order.number,
        party: order.client.name,
        doc: erpInvoiceRef(inv.docType, inv.pos, inv.number),
        issuedAt: inv.issuedAt,
        net: n(inv.amount),
        total,
        status: collected ? "Cobrado" : "Pendiente",
        href: `/backoffice/facturacion/venta?edit=${inv.id}`,
      });
    }

    let hasSupplierOrders = false;
    let hasSupplierInvoices = false;
    let anyPending = false;
    let percepciones = 0;
    const seenPurchase = new Set<string>();
    const supplierOrders = [
      ...order.purchaseOrders.map((po) => ({ po, kind: "Compra" as const, skip: ERP_VENDOR.producer, path: "compra" })),
      ...order.productionOrders.map((po) => ({ po, kind: "Producción" as const, skip: ERP_VENDOR.media, path: "produccion" })),
    ];
    for (const { po, kind, skip, path } of supplierOrders) {
      hasSupplierOrders = true;
      const links = po.invoiceLinks.filter((l) => l.vendorKind !== skip);
      if (links.length === 0) {
        anyPending = true;
        details.push({
          id: `${path}-${po.id}`,
          kind,
          order: po.number,
          party: po.vendor.name,
          doc: null,
          issuedAt: po.issuedAt,
          net: n(po.net),
          total: n(po.amount),
          status: "Sin factura",
          href: `/backoffice/ordenes/${path}?edit=${po.id}`,
        });
        continue;
      }
      for (const link of links) {
        const inv = link.invoice;
        hasSupplierInvoices = true;
        if (!inv.isVatPurchase && !seenPurchase.has(inv.id)) {
          seenPurchase.add(inv.id);
          percepciones += n(inv.vatWithholding) + n(inv.iibbCaba) + n(inv.iibbBsAs);
        }
        const paid = inv.payStatus === ERP_SETTLE.paid;
        if (!paid) anyPending = true;
        details.push({
          id: `${path}-${po.id}-${inv.id}`,
          kind: inv.isVatPurchase ? "Compra IVA" : kind,
          order: po.number,
          party: po.vendor.name,
          doc: erpInvoiceRef(inv.docType, inv.pos, inv.number),
          issuedAt: inv.issuedAt,
          net: n(inv.amount),
          total: erpPurchaseInvoiceTotal(inv),
          status: paid ? "Pagado" : "Pendiente",
          href: `/backoffice/facturacion/${inv.isVatPurchase ? "iva" : "compra"}?edit=${inv.id}`,
        });
      }
    }

    const saleStatus: GestionSaleStatus = !order.invoices.length
      ? "A facturar"
      : allCollected
        ? "Cobrado"
        : "Pendiente";
    const payStatus: GestionPayStatus = !hasSupplierOrders
      ? "—"
      : !hasSupplierInvoices
        ? "Sin facturar"
        : anyPending
          ? "Pendiente"
          : "Pagado";

    if (filter.sale === "to_invoice" && saleStatus !== "A facturar") continue;
    if (filter.sale === "pending" && saleStatus !== "Pendiente") continue;
    if (filter.sale === "collected" && saleStatus !== "Cobrado") continue;
    if (filter.pay === "pending" && payStatus !== "Pendiente" && payStatus !== "Sin facturar") continue;
    if (filter.pay === "paid" && payStatus !== "Pagado") continue;

    const saleNet = n(order.net);
    const purchaseNet =
      order.purchaseOrders.reduce((s, po) => s + n(po.net), 0) +
      order.productionOrders.reduce((s, po) => s + n(po.net), 0);
    const ganancia = saleNet - purchaseNet;
    const retenciones = anyCollected ? retencionesSum : null;
    const gananciaNeta = ganancia - (retenciones ?? 0) - percepciones;

    rows.push({
      id: order.id,
      number: order.number,
      month: order.month,
      year: order.year,
      issuedAt: order.issuedAt,
      client: order.client.name,
      product: order.product,
      elements: [...new Set(order.items.map((i) => i.element))].join(", "),
      saleNet,
      purchaseNet,
      ganancia,
      gananciaPct: saleNet !== 0 ? (ganancia * 100) / saleNet : null,
      retenciones,
      gananciaNeta,
      invoiced,
      saleStatus,
      payStatus,
      details,
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
    where: { payStatus: ERP_SETTLE.pending, paymentLinks: { none: {} }, receiptLinks: { none: {} } },
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
  const paidTwins = invoices.length
    ? await prisma.erpPurchaseInvoice.findMany({
        where: {
          payStatus: ERP_SETTLE.paid,
          OR: invoices.map((inv) => ({ vendorId: inv.vendorId, pos: inv.pos, number: inv.number })),
        },
        select: { vendorId: true, pos: true, number: true },
      })
    : [];
  const paidKeys = new Set(paidTwins.map((t) => `${t.vendorId}|${t.pos}|${t.number}`));
  const now = new Date();
  return invoices.map((inv) => {
    const total = erpPurchaseInvoiceTotal(inv);
    const link = inv.orderLinks[0];
    const order =
      link?.purchaseOrder?.saleOrder.number ?? link?.productionOrder?.saleOrder.number ?? "—";
    return {
      id: inv.id,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      overdue: inv.dueAt < now,
      doc: erpInvoiceRef(inv.docType, inv.pos, inv.number),
      vendor: inv.vendor.name,
      order,
      amount: total,
      isVatPurchase: inv.isVatPurchase,
      paidDuplicate: paidKeys.has(`${inv.vendorId}|${inv.pos}|${inv.number}`),
      href: `/backoffice/facturacion/${inv.isVatPurchase ? "iva" : "compra"}?edit=${inv.id}`,
    };
  });
}

/** Facturas que ya tienen recibo y siguen pendientes pasan a cobradas. */
export async function reconcileSaleCollectStatus() {
  await prisma.erpSaleInvoice.updateMany({
    where: { collectStatus: ERP_COLLECT.pending, receiptLinks: { some: {} } },
    data: { collectStatus: ERP_COLLECT.collected },
  });
}

export async function loadPendingReceivables() {
  await reconcileSaleCollectStatus();
  const invoices = await prisma.erpSaleInvoice.findMany({
    where: { collectStatus: ERP_COLLECT.pending },
    orderBy: { dueAt: "asc" },
    include: {
      client: { select: { name: true } },
      saleOrder: { select: { number: true } },
    },
  });
  const now = new Date();
  return invoices.map((inv) => ({
    id: inv.id,
    issuedAt: inv.issuedAt,
    dueAt: inv.dueAt,
    overdue: inv.dueAt < now,
    doc: erpInvoiceRef(inv.docType, inv.pos, inv.number),
    client: inv.client.name,
    order: inv.saleOrder.number,
    amount: saleLineTotal({
      net: n(inv.amount),
      vat: n(inv.vat),
      retVat: n(inv.retVat),
      retSuss: n(inv.retSuss),
      retGan: n(inv.retGan),
      retIibb: n(inv.retIibb),
    }),
    href: `/backoffice/facturacion/venta?edit=${inv.id}`,
  }));
}

/** O.P. de venta sin cerrar: lo que falta facturar (total sin la parte en efectivo). */
export async function loadOrdersToInvoice() {
  const orders = await prisma.erpSaleOrder.findMany({
    where: { estado: { not: ERP_ORDER.invoiced } },
    orderBy: [{ year: "asc" }, { month: "asc" }, { number: "asc" }],
    include: {
      client: { select: { name: true } },
      invoices: { select: { amount: true, vat: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    number: o.number,
    client: o.client.name,
    product: o.product,
    month: o.month,
    year: o.year,
    net: n(o.net),
    amount: n(o.amount),
    remaining: saleOrderRemaining(o, saleOrderInvoiceCover(o.invoices)).amount,
    href: `/backoffice/ordenes/venta?edit=${o.id}`,
  }));
}

/** Asigna la factura a la primera fila GESTIÓN de la orden que aún no tiene venta. */
export async function syncSaleInvoiceGestion(saleOrderId: string, invoiceId: string) {
  const existing = await prisma.erpGestionLine.findFirst({
    where: { saleInvoiceId: invoiceId },
    select: { id: true, saleOrderId: true },
  });
  if (existing?.saleOrderId === saleOrderId) return;
  if (existing) {
    await prisma.erpGestionLine.update({
      where: { id: existing.id },
      data: { saleInvoiceId: null },
    });
  }
  const empty = await prisma.erpGestionLine.findFirst({
    where: { saleOrderId, saleInvoiceId: null },
    orderBy: { sort: "asc" },
  });
  if (!empty) return;
  await prisma.erpGestionLine.update({
    where: { id: empty.id },
    data: { saleInvoiceId: invoiceId },
  });
}

export async function unlinkSaleInvoiceFromGestion(invoiceId: string) {
  await prisma.erpGestionLine.updateMany({
    where: { saleInvoiceId: invoiceId },
    data: { saleInvoiceId: null },
  });
}
