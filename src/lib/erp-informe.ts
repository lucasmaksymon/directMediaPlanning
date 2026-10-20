import { prisma } from "@/lib/prisma";
import { ERP_CASH_MODE, ERP_ORDER, ERP_VENDOR, erpCashMode } from "@/lib/erp";
import { invoiceWithholdings, receiptWithholdingSelect } from "@/lib/erp-gestion";

export type InformeRow = {
  kind: "order" | "clientTotal" | "monthTotal";
  client: string;
  order: string;
  uninvoiced: boolean;
  compra: number;
  retenciones: number;
  venta: number;
  percepciones: number;
  gananciaNeta: number;
  porcentaje: number | null;
};

export type InformeExpenses = {
  fixed: number;
  bank: number;
  vat: number;
  commissions: number;
  vatPurchase: number;
  extra: number;
  total: number;
  resultado: number;
};

export type MonthlyReport = {
  rows: InformeRow[];
  expenses: InformeExpenses;
};

function n(v: { toString(): string } | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

function pct(ganancia: number, venta: number) {
  return venta !== 0 ? (ganancia * 100) / venta : null;
}

const purchaseInvoiceSelect = {
  id: true,
  isVatPurchase: true,
  amount: true,
  vat: true,
  iibbCaba: true,
  iibbBsAs: true,
  vatWithholding: true,
} as const;

const supplierOrderSelect = {
  estado: true,
  net: true,
  cashAmount: true,
  cashPayment: true,
  invoiceLinks: {
    select: { vendorKind: true, invoice: { select: purchaseInvoiceSelect } },
  },
} as const;

export async function buildMonthlyReport(month: number, year: number): Promise<MonthlyReport> {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);
  const [orders, expense, vatPurchases] = await Promise.all([
    prisma.erpSaleOrder.findMany({
      where: { month, year },
      orderBy: [{ client: { name: "asc" } }, { number: "asc" }],
      include: {
        client: { select: { name: true } },
        invoices: { select: { id: true, amount: true, vat: true } },
        purchaseOrders: { select: supplierOrderSelect },
        productionOrders: { select: supplierOrderSelect },
      },
    }),
    prisma.erpExpense.findUnique({ where: { month_year: { month, year } } }),
    prisma.erpPurchaseInvoice.findMany({
      where: { isVatPurchase: true, issuedAt: { gte: from, lt: to } },
      select: { commission: true },
    }),
  ]);

  const saleInvoiceIds = orders.flatMap((o) => o.invoices.map((i) => i.id));
  const receiptLinks = saleInvoiceIds.length
    ? await prisma.erpSaleReceiptInvoice.findMany({
        where: { invoiceId: { in: saleInvoiceIds } },
        select: { invoiceId: true, ...receiptWithholdingSelect },
      })
    : [];

  const receiptByInvoice = new Map<string, typeof receiptLinks>();
  for (const link of receiptLinks) {
    const list = receiptByInvoice.get(link.invoiceId) ?? [];
    list.push(link);
    receiptByInvoice.set(link.invoiceId, list);
  }

  const rows: InformeRow[] = [];
  let monthCompra = 0;
  let monthRet = 0;
  let monthVenta = 0;
  let monthPerc = 0;
  let monthGan = 0;

  const byClient = new Map<string, typeof orders>();
  for (const order of orders) {
    const list = byClient.get(order.client.name) ?? [];
    list.push(order);
    byClient.set(order.client.name, list);
  }

  for (const [clientName, clientOrders] of byClient) {
    let clientCompra = 0;
    let clientRet = 0;
    let clientVenta = 0;
    let clientPerc = 0;
    let clientGan = 0;

    for (const order of clientOrders) {
      let uninvoiced = order.estado !== ERP_ORDER.invoiced;
      let compra = 0;
      let percepciones = 0;
      const seenPurchase = new Set<string>();

      const supplierOrders = [
        ...order.purchaseOrders.map((po) => ({ po, skip: ERP_VENDOR.producer })),
        ...order.productionOrders.map((po) => ({ po, skip: ERP_VENDOR.media })),
      ];
      for (const { po, skip } of supplierOrders) {
        const mode = erpCashMode(n(po.net), n(po.cashAmount), po.cashPayment);
        if (mode === ERP_CASH_MODE.cash) {
          compra += n(po.net);
          continue;
        }
        if (mode === ERP_CASH_MODE.mixed) compra += n(po.cashAmount);
        const own = po.invoiceLinks.filter((link) => link.vendorKind !== skip);
        const links = own.filter((link) => !link.invoice.isVatPurchase);
        if (own.length === 0) uninvoiced = true;
        else if (links.length > 0 && po.estado !== ERP_ORDER.invoiced) uninvoiced = true;
        for (const link of links) {
          if (seenPurchase.has(link.invoice.id)) continue;
          seenPurchase.add(link.invoice.id);
          compra += n(link.invoice.amount) + n(link.invoice.vat);
          percepciones += n(link.invoice.iibbCaba) + n(link.invoice.iibbBsAs) + n(link.invoice.vatWithholding);
        }
      }

      let venta = 0;
      let retenciones = 0;
      for (const inv of order.invoices) {
        venta += n(inv.amount) + n(inv.vat);
        retenciones += invoiceWithholdings(inv.id, receiptByInvoice.get(inv.id) ?? []);
      }

      const gananciaNeta = venta - retenciones - compra - percepciones;
      rows.push({
        kind: "order",
        client: clientName,
        order: order.number,
        uninvoiced,
        compra,
        retenciones,
        venta,
        percepciones,
        gananciaNeta,
        porcentaje: pct(gananciaNeta, venta),
      });

      clientCompra += compra;
      clientRet += retenciones;
      clientVenta += venta;
      clientPerc += percepciones;
      clientGan += gananciaNeta;
    }

    rows.push({
      kind: "clientTotal",
      client: `Total ${clientName}`,
      order: "",
      uninvoiced: false,
      compra: clientCompra,
      retenciones: clientRet,
      venta: clientVenta,
      percepciones: clientPerc,
      gananciaNeta: clientGan,
      porcentaje: pct(clientGan, clientVenta),
    });

    monthCompra += clientCompra;
    monthRet += clientRet;
    monthVenta += clientVenta;
    monthPerc += clientPerc;
    monthGan += clientGan;
  }

  if (rows.length) {
    rows.push({
      kind: "monthTotal",
      client: "Total",
      order: "",
      uninvoiced: false,
      compra: monthCompra,
      retenciones: monthRet,
      venta: monthVenta,
      percepciones: monthPerc,
      gananciaNeta: monthGan,
      porcentaje: pct(monthGan, monthVenta),
    });
  }

  const fixed = n(expense?.fixed);
  const bank = n(expense?.bank);
  const vat = n(expense?.vat);
  const commissions = n(expense?.commissions);
  const extra = n(expense?.extra);
  const vatPurchase = vatPurchases.reduce((sum, inv) => sum + n(inv.commission), 0);
  const total = fixed + bank + vat + commissions + vatPurchase + extra;

  return {
    rows,
    expenses: {
      fixed,
      bank,
      vat,
      commissions,
      vatPurchase,
      extra,
      total,
      resultado: monthGan - total,
    },
  };
}
