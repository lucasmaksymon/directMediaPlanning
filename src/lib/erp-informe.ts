import { prisma } from "@/lib/prisma";
import { ERP_ORDER, ERP_PAY, ERP_VENDOR } from "@/lib/erp";

export type InformeRow = {
  kind: "order" | "clientTotal" | "monthTotal" | "expenses";
  client: string;
  order: string;
  uninvoiced: boolean;
  compraNeto: number;
  compraIva: number;
  compraIibb: number;
  compraRetIva: number;
  compraTotal: number;
  ventaNeto: number;
  ventaIva: number;
  ventaRetIva: number;
  ventaRetSuss: number;
  ventaRetGan: number;
  ventaRetIibb: number;
  ventaTotal: number;
  totalCompraIva: number;
  comision: number;
  gananciaBruta: number;
  porcentaje: number | null;
};

function n(v: { toString(): string } | number | null | undefined) {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export async function buildMonthlyReport(month: number, year: number): Promise<InformeRow[]> {
  const orders = await prisma.erpSaleOrder.findMany({
    where: { month, year },
    orderBy: [{ client: { name: "asc" } }, { number: "asc" }],
    include: {
      client: { select: { name: true } },
      invoices: { select: { id: true, amount: true, vat: true } },
      purchaseOrders: {
        include: {
          invoiceLinks: {
            include: {
              invoice: true,
            },
          },
        },
      },
      productionOrders: {
        include: {
          invoiceLinks: {
            include: { invoice: true },
          },
        },
      },
    },
  });

  const saleInvoiceIds = orders.flatMap((o) => o.invoices.map((i) => i.id));
  const receiptLinks = saleInvoiceIds.length
    ? await prisma.erpSaleReceiptInvoice.findMany({
        where: { invoiceId: { in: saleInvoiceIds } },
        include: {
          receipt: {
            include: { payments: true },
          },
        },
      })
    : [];

  const vatPurchases = await prisma.erpPurchaseInvoice.findMany({
    where: {
      isVatPurchase: true,
      orderLinks: {
        some: {
          OR: [
            { purchaseOrder: { saleOrder: { month, year } } },
            { productionOrder: { saleOrder: { month, year } } },
          ],
        },
      },
    },
    include: {
      orderLinks: {
        include: {
          purchaseOrder: { select: { saleOrderId: true, estado: true } },
          productionOrder: { select: { saleOrderId: true, estado: true } },
        },
      },
    },
  });

  const rows: InformeRow[] = [];
  let monthCompra = 0;
  let monthVenta = 0;
  let monthIva = 0;
  let monthComision = 0;
  let monthGan = 0;

  const byClient = new Map<string, typeof orders>();
  for (const order of orders) {
    const list = byClient.get(order.client.name) ?? [];
    list.push(order);
    byClient.set(order.client.name, list);
  }

  for (const [clientName, clientOrders] of byClient) {
    let clientCompra = 0;
    let clientVenta = 0;
    let clientIva = 0;
    let clientComision = 0;
    let clientGan = 0;

    for (const order of clientOrders) {
      let uninvoiced = order.estado !== ERP_ORDER.invoiced;
      let compraNeto = 0;
      let compraIva = 0;
      let compraIibb = 0;
      let compraRetIva = 0;

      for (const po of order.purchaseOrders) {
        for (const link of po.invoiceLinks) {
          if (link.vendorKind === ERP_VENDOR.producer) continue;
          if (link.invoice.isVatPurchase) continue;
          if (po.estado !== ERP_ORDER.invoiced) uninvoiced = true;
          compraNeto += n(link.invoice.amount);
          compraIva += n(link.invoice.vat);
          compraIibb += n(link.invoice.iibbCaba) + n(link.invoice.iibbBsAs);
          compraRetIva += n(link.invoice.vatWithholding);
        }
        if (po.invoiceLinks.length === 0) uninvoiced = true;
      }

      for (const prod of order.productionOrders) {
        for (const link of prod.invoiceLinks) {
          if (link.vendorKind === ERP_VENDOR.media) continue;
          if (prod.estado !== ERP_ORDER.invoiced) uninvoiced = true;
          compraNeto += n(link.invoice.amount);
          compraIva += n(link.invoice.vat);
          compraIibb += n(link.invoice.iibbCaba) + n(link.invoice.iibbBsAs);
          compraRetIva += n(link.invoice.vatWithholding);
        }
        if (prod.invoiceLinks.length === 0) uninvoiced = true;
      }

      let ventaNeto = 0;
      let ventaIva = 0;
      let ventaRetIva = 0;
      let ventaRetIibb = 0;
      let ventaRetGan = 0;
      let ventaRetSuss = 0;
      const seenPay = new Set<string>();

      for (const inv of order.invoices) {
        ventaNeto += n(inv.amount);
        ventaIva += n(inv.vat);
        for (const link of receiptLinks.filter((l) => l.invoiceId === inv.id)) {
          for (const pay of link.receipt.payments) {
            if (pay.paymentKind < ERP_PAY.retVat) continue;
            const key = `${link.receiptId}:${pay.paymentKind}`;
            if (seenPay.has(key)) continue;
            seenPay.add(key);
            const amt = n(pay.amount);
            if (pay.paymentKind === ERP_PAY.retVat) ventaRetIva += amt;
            else if (pay.paymentKind === ERP_PAY.retIibb || pay.paymentKind === ERP_PAY.retIibbAlt) {
              ventaRetIibb += amt;
            } else if (pay.paymentKind === ERP_PAY.retGan) ventaRetGan += amt;
            else if (pay.paymentKind === ERP_PAY.retSuss) ventaRetSuss += amt;
          }
        }
      }

      let totalCompraIva = 0;
      let comision = 0;
      for (const inv of vatPurchases) {
        const linked = inv.orderLinks.some(
          (l) =>
            l.purchaseOrder?.saleOrderId === order.id ||
            l.productionOrder?.saleOrderId === order.id,
        );
        if (!linked) continue;
        totalCompraIva += n(inv.amount) + n(inv.vat);
        comision += n(inv.commission);
        const orderEstado =
          inv.orderLinks.find((l) => l.purchaseOrder?.saleOrderId === order.id)?.purchaseOrder
            ?.estado ??
          inv.orderLinks.find((l) => l.productionOrder?.saleOrderId === order.id)?.productionOrder
            ?.estado;
        if (orderEstado !== ERP_ORDER.invoiced) uninvoiced = true;
      }

      const compraTotal = compraNeto + compraIva + compraIibb + compraRetIva;
      const ventaTotal = ventaNeto + ventaIva - ventaRetIva - ventaRetIibb - ventaRetGan - ventaRetSuss;
      const gananciaBruta = ventaTotal - compraTotal - totalCompraIva;
      const porcentaje = ventaTotal !== 0 ? (gananciaBruta * 100) / ventaTotal : null;

      rows.push({
        kind: "order",
        client: clientName,
        order: order.number,
        uninvoiced,
        compraNeto,
        compraIva,
        compraIibb,
        compraRetIva,
        compraTotal,
        ventaNeto,
        ventaIva,
        ventaRetIva,
        ventaRetSuss,
        ventaRetGan,
        ventaRetIibb,
        ventaTotal,
        totalCompraIva,
        comision,
        gananciaBruta,
        porcentaje,
      });

      clientCompra += compraTotal;
      clientVenta += ventaTotal;
      clientIva += totalCompraIva;
      clientComision += comision;
      clientGan += gananciaBruta;
    }

    rows.push({
      kind: "clientTotal",
      client: `Total ${clientName}`,
      order: "",
      uninvoiced: false,
      compraNeto: 0,
      compraIva: 0,
      compraIibb: 0,
      compraRetIva: 0,
      compraTotal: clientCompra,
      ventaNeto: 0,
      ventaIva: 0,
      ventaRetIva: 0,
      ventaRetSuss: 0,
      ventaRetGan: 0,
      ventaRetIibb: 0,
      ventaTotal: clientVenta,
      totalCompraIva: clientIva,
      comision: clientComision,
      gananciaBruta: clientGan,
      porcentaje: clientVenta !== 0 ? (clientGan * 100) / clientVenta : null,
    });

    monthCompra += clientCompra;
    monthVenta += clientVenta;
    monthIva += clientIva;
    monthComision += clientComision;
    monthGan += clientGan;
  }

  const expense = await prisma.erpExpense.findUnique({
    where: { month_year: { month, year } },
  });
  const gastoFijo = n(expense?.fixed);
  const gastoBanco = n(expense?.bank);
  const gastoIva = n(expense?.vat);
  const gastoCom = n(expense?.commissions);
  const gastos = gastoFijo + gastoBanco + gastoIva + gastoCom;

  rows.push({
    kind: "monthTotal",
    client: "Total",
    order: "",
    uninvoiced: false,
    compraNeto: 0,
    compraIva: 0,
    compraIibb: 0,
    compraRetIva: 0,
    compraTotal: monthCompra,
    ventaNeto: 0,
    ventaIva: 0,
    ventaRetIva: 0,
    ventaRetSuss: 0,
    ventaRetGan: 0,
    ventaRetIibb: 0,
    ventaTotal: monthVenta,
    totalCompraIva: monthIva,
    comision: monthComision,
    gananciaBruta: monthGan,
    porcentaje: monthVenta !== 0 ? (monthGan * 100) / monthVenta : null,
  });

  if (expense) {
    rows.push({
      kind: "expenses",
      client: "Gastos del mes",
      order: "",
      uninvoiced: false,
      compraNeto: gastoFijo,
      compraIva: gastoBanco,
      compraIibb: gastoIva,
      compraRetIva: gastoCom,
      compraTotal: gastos,
      ventaNeto: 0,
      ventaIva: 0,
      ventaRetIva: 0,
      ventaRetSuss: 0,
      ventaRetGan: 0,
      ventaRetIibb: 0,
      ventaTotal: 0,
      totalCompraIva: 0,
      comision: 0,
      gananciaBruta: monthGan - gastos,
      porcentaje: null,
    });
  }

  return rows;
}
