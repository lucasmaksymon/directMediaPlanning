import { auth } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { displayDate, ERP_MONTHS, erpOrderLabel, money } from "@/lib/erp";
import { ErpOrderDocument, type ErpOrderPdfKind } from "@/lib/pdf/erp-order-document";

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
      include: { client: { select: { name: true, taxId: true } } },
    });
    if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const buffer = await renderToBuffer(
      ErpOrderDocument({
        kind: "venta",
        number: order.number,
        issuedAt: displayDate(order.issuedAt),
        period: `${ERP_MONTHS[order.month]} ${order.year}`,
        counterpartyLabel: "RAZÓN SOCIAL",
        counterparty: order.client.name,
        taxId: order.client.taxId,
        net: money(order.net),
        vat: money(order.vat),
        amount: money(order.amount),
        estado: erpOrderLabel(order.estado),
      }),
    );
    return pdfResponse(buffer, `OP-${order.number}.pdf`);
  }

  if (tipo === "compra") {
    const order = await prisma.erpPurchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: { select: { name: true, taxId: true } },
        saleOrder: { select: { number: true, month: true, year: true, client: { select: { name: true } } } },
      },
    });
    if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const buffer = await renderToBuffer(
      ErpOrderDocument({
        kind: "compra",
        number: order.number,
        issuedAt: displayDate(order.issuedAt),
        period: `${ERP_MONTHS[order.saleOrder.month]} ${order.saleOrder.year}`,
        counterpartyLabel: "PROVEEDOR",
        counterparty: order.vendor.name,
        taxId: order.vendor.taxId,
        relatedLabel: "O.P. VENTA",
        related: `${order.saleOrder.number} · ${order.saleOrder.client.name}`,
        net: money(order.net),
        vat: money(order.vat),
        amount: money(order.amount),
        estado: erpOrderLabel(order.estado),
      }),
    );
    return pdfResponse(buffer, `OC-${order.number}.pdf`);
  }

  const order = await prisma.erpProductionOrder.findUnique({
    where: { id },
    include: {
      vendor: { select: { name: true, taxId: true } },
      saleOrder: { select: { number: true, month: true, year: true, client: { select: { name: true } } } },
    },
  });
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  const buffer = await renderToBuffer(
    ErpOrderDocument({
      kind: "produccion",
      number: order.number,
      issuedAt: displayDate(order.issuedAt),
      period: `${ERP_MONTHS[order.saleOrder.month]} ${order.saleOrder.year}`,
      counterpartyLabel: "PRODUCTOR",
      counterparty: order.vendor.name,
      taxId: order.vendor.taxId,
      relatedLabel: "O.P. VENTA",
      related: `${order.saleOrder.number} · ${order.saleOrder.client.name}`,
      net: money(order.net),
      vat: money(order.vat),
      amount: money(order.amount),
      estado: erpOrderLabel(order.estado),
    }),
  );
  return pdfResponse(buffer, `OR-${order.number}.pdf`);
}

function pdfResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
