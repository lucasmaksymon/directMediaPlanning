import { prisma } from "@/lib/prisma";
import { ERP_PAY, ERP_PAY_STATUS } from "@/lib/erp";
import { loadOrdersToInvoice, loadPendingPayables, loadPendingReceivables } from "@/lib/erp-gestion";

function n(v: { toString(): string } | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export type DashboardDue = {
  id: string;
  kind: "cobro" | "pago";
  dueAt: Date;
  overdue: boolean;
  party: string;
  doc: string;
  order: string;
  amount: number;
  href: string;
  vatPurchase?: boolean;
};

export type DashboardOrder = {
  id: string;
  number: string;
  client: string;
  amount: number;
  month: number;
  year: number;
};

export type DashboardCampaign = {
  id: string;
  element: string;
  location: string | null;
  client: string;
  order: string;
  orderId: string;
  endsAt: Date | null;
};

type Bucket = { count: number; amount: number; overdueCount: number; overdueAmount: number };

export type BackofficeDashboard = {
  month: number;
  year: number;
  venta: number;
  compra: number;
  ganancia: number;
  margen: number | null;
  previous: { month: number; year: number; venta: number; ganancia: number };
  toInvoice: { count: number; amount: number; rows: DashboardOrder[] };
  receivables: Bucket;
  payables: Bucket;
  cheques: { count: number; amount: number; receivedCount: number; issuedCount: number };
  agenda: DashboardDue[];
  campaigns: DashboardCampaign[];
  topClients: { name: string; ganancia: number; venta: number }[];
  recentOrders: DashboardOrder[];
  failed: boolean;
};

const AGENDA_SIZE = 12;
const LIST_SIZE = 8;

function emptyDashboard(month: number, year: number): BackofficeDashboard {
  const prev = previousPeriod(month, year);
  const bucket = { count: 0, amount: 0, overdueCount: 0, overdueAmount: 0 };
  return {
    month,
    year,
    venta: 0,
    compra: 0,
    ganancia: 0,
    margen: null,
    previous: { ...prev, venta: 0, ganancia: 0 },
    toInvoice: { count: 0, amount: 0, rows: [] },
    receivables: bucket,
    payables: bucket,
    cheques: { count: 0, amount: 0, receivedCount: 0, issuedCount: 0 },
    agenda: [],
    campaigns: [],
    topClients: [],
    recentOrders: [],
    failed: true,
  };
}

function previousPeriod(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

function bucket<T extends { amount: number; overdue: boolean }>(rows: T[]): Bucket {
  let amount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  for (const row of rows) {
    amount += row.amount;
    if (row.overdue) {
      overdueCount += 1;
      overdueAmount += row.amount;
    }
  }
  return { count: rows.length, amount, overdueCount, overdueAmount };
}

/** Venta y compra netas de las órdenes del período (no de lo facturado). */
async function loadMonthlyOrderTotals(month: number, year: number) {
  const orders = await prisma.erpSaleOrder.findMany({
    where: { month, year },
    select: {
      net: true,
      client: { select: { name: true } },
      purchaseOrders: { select: { net: true } },
      productionOrders: { select: { net: true } },
    },
  });

  const byClient = new Map<string, { venta: number; compra: number }>();
  let venta = 0;
  let compra = 0;
  for (const order of orders) {
    const orderVenta = n(order.net);
    const orderCompra =
      order.purchaseOrders.reduce((s, po) => s + n(po.net), 0) +
      order.productionOrders.reduce((s, po) => s + n(po.net), 0);
    venta += orderVenta;
    compra += orderCompra;
    const client = byClient.get(order.client.name) ?? { venta: 0, compra: 0 };
    client.venta += orderVenta;
    client.compra += orderCompra;
    byClient.set(order.client.name, client);
  }

  const topClients = [...byClient]
    .map(([name, c]) => ({ name, venta: c.venta, ganancia: c.venta - c.compra }))
    .sort((a, b) => Math.abs(b.ganancia) - Math.abs(a.ganancia))
    .slice(0, 6);

  return { venta, compra, topClients };
}

/** Solo sumas: el mes anterior se usa para comparar, no para listar. */
async function loadPeriodSums(month: number, year: number) {
  const period = { month, year };
  const [sale, purchase, production] = await Promise.all([
    prisma.erpSaleOrder.aggregate({ where: period, _sum: { net: true } }),
    prisma.erpPurchaseOrder.aggregate({ where: { saleOrder: period }, _sum: { net: true } }),
    prisma.erpProductionOrder.aggregate({ where: { saleOrder: period }, _sum: { net: true } }),
  ]);
  const venta = n(sale._sum.net);
  return { venta, ganancia: venta - n(purchase._sum.net) - n(production._sum.net) };
}

export async function loadBackofficeDashboard(): Promise<BackofficeDashboard> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const prev = previousPeriod(month, year);

  try {
    const [totals, previous, receivables, payables, toInvoice, cheques, campaigns, recentOrders] =
      await Promise.all([
        loadMonthlyOrderTotals(month, year),
        loadPeriodSums(prev.month, prev.year),
        loadPendingReceivables(),
        loadPendingPayables(),
        loadOrdersToInvoice(),
        prisma.erpTreasuryPayment.findMany({
          where: { paymentKind: ERP_PAY.cheque, estado: ERP_PAY_STATUS.pending },
          select: { amount: true, saleReceiptId: true },
        }),
        prisma.erpCampaignItem.findMany({
          where: { startsAt: { lte: now }, endsAt: { gte: now } },
          orderBy: { endsAt: "asc" },
          select: {
            id: true,
            element: true,
            location: true,
            endsAt: true,
            saleOrder: { select: { id: true, number: true, client: { select: { name: true } } } },
          },
          take: 12,
        }),
        prisma.erpSaleOrder.findMany({
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            number: true,
            amount: true,
            month: true,
            year: true,
            client: { select: { name: true } },
          },
          take: LIST_SIZE,
        }),
      ]);

    const { venta, compra, topClients } = totals;
    const ganancia = venta - compra;

    const agenda: DashboardDue[] = [
      ...payables.map((p) => ({
        id: p.id,
        kind: "pago" as const,
        dueAt: p.dueAt,
        overdue: p.overdue,
        party: p.vendor,
        doc: p.doc,
        order: p.order,
        amount: p.amount,
        href: p.href,
        vatPurchase: p.isVatPurchase,
      })),
      ...receivables.map((r) => ({
        id: r.id,
        kind: "cobro" as const,
        dueAt: r.dueAt,
        overdue: r.overdue,
        party: r.client,
        doc: r.doc,
        order: r.order,
        amount: r.amount,
        href: r.href,
      })),
    ]
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .slice(0, AGENDA_SIZE);

    const openOrders = [...toInvoice]
      .sort((a, b) => b.year - a.year || b.month - a.month || a.number.localeCompare(b.number))
      .slice(0, LIST_SIZE);

    const receivedCheques = cheques.filter((c) => c.saleReceiptId).length;

    return {
      month,
      year,
      venta,
      compra,
      ganancia,
      margen: venta !== 0 ? (ganancia * 100) / venta : null,
      previous: { ...prev, ...previous },
      toInvoice: {
        count: toInvoice.length,
        amount: toInvoice.reduce((s, o) => s + o.remaining, 0),
        rows: openOrders.map((o) => ({
          id: o.id,
          number: o.number,
          client: o.client,
          amount: o.remaining,
          month: o.month,
          year: o.year,
        })),
      },
      receivables: bucket(receivables),
      payables: bucket(payables),
      cheques: {
        count: cheques.length,
        amount: cheques.reduce((s, c) => s + n(c.amount), 0),
        receivedCount: receivedCheques,
        issuedCount: cheques.length - receivedCheques,
      },
      agenda,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        element: c.element,
        location: c.location,
        client: c.saleOrder.client.name,
        order: c.saleOrder.number,
        orderId: c.saleOrder.id,
        endsAt: c.endsAt,
      })),
      topClients,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        number: o.number,
        client: o.client.name,
        amount: n(o.amount),
        month: o.month,
        year: o.year,
      })),
      failed: false,
    };
  } catch (e) {
    console.error("[backoffice] no se pudo armar el dashboard ERP", e);
    return emptyDashboard(month, year);
  }
}
