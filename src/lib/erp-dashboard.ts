import { prisma } from "@/lib/prisma";
import { ERP_COLLECT, ERP_ORDER, ERP_PAY, ERP_SETTLE } from "@/lib/erp";
import { loadPendingPayables, saleLineTotal } from "@/lib/erp-gestion";
import { buildMonthlyReport } from "@/lib/erp-informe";

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

export type BackofficeDashboard = {
  month: number;
  year: number;
  venta: number;
  compra: number;
  ganancia: number;
  margen: number | null;
  gastos: number;
  resultado: number;
  toInvoice: { count: number; amount: number; rows: DashboardOrder[] };
  receivables: { count: number; amount: number; overdueCount: number; overdueAmount: number };
  payables: { count: number; amount: number; overdueCount: number; overdueAmount: number };
  cheques: { count: number; amount: number };
  agenda: DashboardDue[];
  campaigns: DashboardCampaign[];
  topClients: { name: string; ganancia: number; venta: number }[];
  recentOrders: DashboardOrder[];
};

const empty: BackofficeDashboard = {
  month: 1,
  year: 2026,
  venta: 0,
  compra: 0,
  ganancia: 0,
  margen: null,
  gastos: 0,
  resultado: 0,
  toInvoice: { count: 0, amount: 0, rows: [] },
  receivables: { count: 0, amount: 0, overdueCount: 0, overdueAmount: 0 },
  payables: { count: 0, amount: 0, overdueCount: 0, overdueAmount: 0 },
  cheques: { count: 0, amount: 0 },
  agenda: [],
  campaigns: [],
  topClients: [],
  recentOrders: [],
};

export async function loadBackofficeDashboard(): Promise<BackofficeDashboard> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    const [report, payables, saleInvoices, openOrders, openOrderCount, openSum, cheques, campaigns, recentOrders] =
      await Promise.all([
        buildMonthlyReport(month, year),
        loadPendingPayables(),
        prisma.erpSaleInvoice.findMany({
          where: { collectStatus: ERP_COLLECT.pending },
          orderBy: { dueAt: "asc" },
          include: {
            client: { select: { name: true } },
            saleOrder: { select: { number: true } },
          },
        }),
        prisma.erpSaleOrder.findMany({
          where: { estado: { not: ERP_ORDER.invoiced } },
          orderBy: [{ year: "desc" }, { month: "desc" }, { number: "asc" }],
          include: { client: { select: { name: true } } },
          take: 8,
        }),
        prisma.erpSaleOrder.count({ where: { estado: { not: ERP_ORDER.invoiced } } }),
        prisma.erpSaleOrder.aggregate({
          where: { estado: { not: ERP_ORDER.invoiced } },
          _sum: { amount: true },
        }),
        prisma.erpTreasuryPayment.findMany({
          where: {
            paymentKind: { in: [ERP_PAY.cheque, ERP_PAY.transfer] },
            estado: ERP_SETTLE.pending,
          },
          include: {
            saleReceipt: { include: { client: { select: { name: true } } } },
            purchaseReceipt: { include: { vendor: { select: { name: true } } } },
          },
        }),
        prisma.erpCampaignItem.findMany({
          where: {
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
          orderBy: { endsAt: "asc" },
          include: {
            saleOrder: { select: { id: true, number: true, client: { select: { name: true } } } },
          },
          take: 12,
        }),
        prisma.erpSaleOrder.findMany({
          orderBy: { updatedAt: "desc" },
          include: { client: { select: { name: true } } },
          take: 8,
        }),
      ]);

    const monthRow = report.find((r) => r.kind === "monthTotal");
    const expenseRow = report.find((r) => r.kind === "expenses");
    const venta = monthRow?.ventaTotal ?? 0;
    const compra = (monthRow?.compraTotal ?? 0) + (monthRow?.totalCompraIva ?? 0);
    const ganancia = monthRow?.gananciaBruta ?? 0;
    const gastos = expenseRow?.compraTotal ?? 0;
    const resultado = expenseRow?.gananciaBruta ?? ganancia - gastos;
    const margen = monthRow?.porcentaje ?? null;

    const topClients = report
      .filter((r) => r.kind === "clientTotal")
      .map((r) => ({
        name: r.client.replace(/^Total\s+/, ""),
        ganancia: r.gananciaBruta,
        venta: r.ventaTotal,
      }))
      .sort((a, b) => Math.abs(b.ganancia) - Math.abs(a.ganancia))
      .slice(0, 6);

    const receivablesRows = saleInvoices.map((inv) => {
      const amount = saleLineTotal({
        net: n(inv.amount),
        vat: n(inv.vat),
        retVat: n(inv.retVat),
        retSuss: n(inv.retSuss),
        retGan: n(inv.retGan),
        retIibb: n(inv.retIibb),
      });
      return {
        id: inv.id,
        dueAt: inv.dueAt,
        overdue: inv.dueAt < now,
        party: inv.client.name,
        doc: `${inv.docType} ${inv.pos}-${inv.number}`,
        order: inv.saleOrder.number,
        amount,
        href: `/backoffice/facturacion/venta?edit=${inv.id}`,
      };
    });

    const payDue: DashboardDue[] = payables.map((p) => ({
      id: p.id,
      kind: "pago" as const,
      dueAt: p.dueAt,
      overdue: p.overdue,
      party: p.vendor,
      doc: p.doc,
      order: p.order,
      amount: p.amount,
      href: `/backoffice/facturacion/compra?edit=${p.id}`,
    }));
    const cobroDue: DashboardDue[] = receivablesRows.map((r) => ({
      ...r,
      kind: "cobro" as const,
    }));
    const agenda = [...payDue, ...cobroDue]
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
      .slice(0, 12);

    const toInvoiceRows: DashboardOrder[] = openOrders.map((o) => ({
      id: o.id,
      number: o.number,
      client: o.client.name,
      amount: n(o.amount),
      month: o.month,
      year: o.year,
    }));

    return {
      month,
      year,
      venta,
      compra,
      ganancia,
      margen,
      gastos,
      resultado,
      toInvoice: {
        count: openOrderCount,
        amount: n(openSum._sum.amount),
        rows: toInvoiceRows,
      },
      receivables: {
        count: receivablesRows.length,
        amount: receivablesRows.reduce((s, r) => s + r.amount, 0),
        overdueCount: receivablesRows.filter((r) => r.overdue).length,
        overdueAmount: receivablesRows.filter((r) => r.overdue).reduce((s, r) => s + r.amount, 0),
      },
      payables: {
        count: payables.length,
        amount: payables.reduce((s, p) => s + p.amount, 0),
        overdueCount: payables.filter((p) => p.overdue).length,
        overdueAmount: payables.filter((p) => p.overdue).reduce((s, p) => s + p.amount, 0),
      },
      cheques: {
        count: cheques.length,
        amount: cheques.reduce((s, c) => s + n(c.amount), 0),
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
    };
  } catch (e) {
    console.error("[backoffice] no se pudo armar el dashboard ERP", e);
    return { ...empty, month, year };
  }
}
