import { auth } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { displayDate, money } from "@/lib/erp";
import {
  adjustmentLabel,
  defaultProductionObservations,
  defaultPurchaseObservations,
  defaultSaleObservations,
  longDate,
  purchaseBreakdown,
  purchaseCostLabel,
  saleBreakdown,
  salePeriodText,
} from "@/lib/erp-order-docs";
import {
  ErpProductionOrderDocument,
  ErpPurchaseOrderDocument,
  ErpSaleOrderDocument,
  type ErpOrderPdfKind,
} from "@/lib/pdf/erp-order-document";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") as ErpOrderPdfKind | null;
  const id = searchParams.get("id");
  if (!id || !tipo || !["venta", "compra", "produccion"].includes(tipo)) {
    return Response.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  if (tipo === "venta") {
    const order = await prisma.erpSaleOrder.findUnique({
      where: { id },
      include: { client: { select: { name: true, taxId: true, agencyFee: true } }, items: true },
    });
    if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const items = order.items.map((item) => ({
      element: item.element,
      location: item.location,
      plaza: item.plaza,
      days: item.days,
      faces: Number(item.faces),
      quantity: Number(item.quantity),
      measures: item.measures,
      unitCost: Number(item.unitCost),
      exhibitionNet: Number(item.exhibitionNet),
      bonusNet: Number(item.bonusNet),
      productionNet: Number(item.productionNet),
    }));
    const breakdown = saleBreakdown(items);
    const agencyFeePct = Number(order.agencyFee ?? order.client.agencyFee ?? 0);
    const agencyBase = breakdown.hasLines ? breakdown.subExhibition + breakdown.production : Number(order.net);
    const agency = agencyBase * (agencyFeePct / 100);
    const buffer = await renderToBuffer(
      ErpSaleOrderDocument({
        number: order.number,
        issuedAt: displayDate(order.issuedAt),
        client: order.client.name,
        taxId: order.client.taxId,
        product: order.product,
        plaza: order.plaza,
        period: salePeriodText({
          periodLabel: order.periodLabel,
          month: order.month,
          year: order.year,
          items: order.items,
        }),
        observations: order.observations || defaultSaleObservations(order.client.name),
        agencyFeePct,
        items,
        exhibition: breakdown.exhibition,
        bonus: breakdown.bonus,
        production: breakdown.production,
        subExhibition: breakdown.subExhibition,
        agency,
        hasLines: breakdown.hasLines,
        net: money(order.net),
        vat: money(order.vat),
        amount: money(order.amount),
      }),
    );
    return pdfResponse(buffer, `OC-${order.number}.pdf`);
  }

  if (tipo === "compra") {
    const order = await prisma.erpPurchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: { select: { name: true, taxId: true } },
        saleOrder: { select: { number: true, product: true, month: true, year: true, client: { select: { name: true } } } },
        items: true,
        adjustments: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const period =
      order.startsAt || order.endsAt
        ? null
        : salePeriodText({ month: order.saleOrder.month, year: order.saleOrder.year });
    const items = order.items.map((item) => ({
      element: item.element,
      location: item.location,
      quantity: Number(item.quantity),
      days: item.days,
      measures: item.measures,
      unitCost: Number(item.unitCost),
      net: Number(item.net),
    }));
    const adjustments = order.adjustments.map((adj) => ({
      label: adj.label,
      kind: adj.kind,
      percent: adj.percent == null ? null : Number(adj.percent),
      amount: Number(adj.amount),
    }));
    const breakdown = purchaseBreakdown({ grossNet: Number(order.grossNet), items, adjustments });
    const costLabel = purchaseCostLabel({ costLabel: order.costLabel, days: order.days });
    const buffer = await renderToBuffer(
      ErpPurchaseOrderDocument({
        number: order.number,
        issuedAt: displayDate(order.issuedAt),
        vendor: order.vendor.name,
        taxId: order.vendor.taxId,
        client: order.saleOrder.client.name,
        product: order.product || order.saleOrder.product,
        media: order.media,
        measures: order.measures,
        locations: order.locations,
        circuit: order.circuit,
        support: order.support,
        plaza: order.plaza,
        pautaTitle: `PAUTA PUBLICITARIA ${order.saleOrder.year}`,
        costHeader: costLabel.replace(/^COSTO NETO TOTAL/, "COSTO"),
        costLabel,
        startsAt: longDate(order.startsAt),
        endsAt: longDate(order.endsAt),
        period,
        days: order.days,
        spotCount: order.spotCount,
        paidQty: Number(order.paidQty),
        bonusQty: Number(order.bonusQty),
        unitCost: Number(order.unitCost),
        printShop: order.printShop,
        printSupport: order.printSupport,
        observations: order.observations || defaultPurchaseObservations(order.saleOrder.client.name),
        items,
        adjustments: breakdown.rows.map((row) => ({
          label: adjustmentLabel(row),
          value: row.value,
        })),
        gross: breakdown.gross,
        net: money(order.net),
        vatRate: Number(order.vatRate),
        vat: money(order.vat),
        amount: money(order.amount),
        hasVat: Number(order.vat) > 0,
      }),
    );
    return pdfResponse(buffer, `OP-${order.number}.pdf`);
  }

  const order = await prisma.erpProductionOrder.findUnique({
    where: { id },
    include: {
      vendor: { select: { name: true, taxId: true } },
      saleOrder: { select: { number: true, product: true, client: { select: { name: true } } } },
      items: true,
      deliveries: true,
    },
  });
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  const buffer = await renderToBuffer(
    ErpProductionOrderDocument({
      number: order.number,
      issuedAt: displayDate(order.issuedAt),
      vendor: order.vendor.name,
      taxId: order.vendor.taxId,
      client: order.saleOrder.client.name,
      product: order.product || order.saleOrder.product,
      measures: order.measures,
      printSupport: order.printSupport,
      quantity: Number(order.quantity),
      motifs: order.motifs,
      unitCost: Number(order.unitCost),
      invoiceDetail: order.invoiceDetail,
      pickup: order.pickup,
      colorProof: order.colorProof,
      observations: order.observations || defaultProductionObservations(),
      items: order.items.map((item) => ({
        element: item.element,
        location: item.location,
        quantity: Number(item.quantity),
        measures: item.measures,
        printSupport: item.printSupport,
        net: Number(item.net),
      })),
      deliveries: order.deliveries.map((d) => ({
        destination: d.destination,
        quantity: Number(d.quantity),
      })),
      net: money(order.net),
      vat: money(order.vat),
      amount: money(order.amount),
    }),
  );
  return pdfResponse(buffer, `OP-${order.number}.pdf`);
}

function pdfResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
