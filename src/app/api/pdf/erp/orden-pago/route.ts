import { auth } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import {
  displayDate,
  erpPayPurchaseLabel,
  erpPaymentOrderNumber,
  erpPurchaseDocRefOld,
  erpPurchaseInvoiceTotal,
  money,
} from "@/lib/erp";
import { ErpPaymentOrderDocument } from "@/lib/pdf/erp-payment-order-document";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID requerido." }, { status: 400 });

  const order = await prisma.erpPaymentOrder.findUnique({
    where: { id },
    include: {
      vendor: { select: { name: true } },
      invoices: {
        include: {
          invoice: {
            select: {
              issuedAt: true,
              docType: true,
              pos: true,
              number: true,
              amount: true,
              vat: true,
              vatWithholding: true,
              iibbCaba: true,
              iibbBsAs: true,
              internalTax: true,
              nonTaxable: true,
            },
          },
        },
      },
      treasury: { orderBy: [{ issuedAt: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });

  const invoices = [...order.invoices].sort((a, b) => {
    const t = a.invoice.docType.localeCompare(b.invoice.docType);
    if (t) return t;
    if (a.invoice.pos !== b.invoice.pos) return a.invoice.pos - b.invoice.pos;
    return a.invoice.number - b.invoice.number;
  });

  const imputations = invoices.map((link) => {
    const total = erpPurchaseInvoiceTotal(link.invoice);
    return {
      label: erpPurchaseDocRefOld(link.invoice.docType, link.invoice.pos, link.invoice.number),
      date: displayDate(link.invoice.issuedAt),
      amount: money(total),
      raw: total,
    };
  });

  const payments =
    order.treasury.length > 0
      ? order.treasury.map((p) => ({
          label: `${erpPayPurchaseLabel(p.paymentKind).toUpperCase()} Nº ${p.number ?? ""}`.trim(),
          date: displayDate(p.issuedAt),
          amount: money(p.amount),
          raw: Number(p.amount),
        }))
      : order.notes
        ? [
            {
              label: order.notes.toUpperCase(),
              date: displayDate(order.issuedAt),
              amount: money(order.amount),
              raw: Number(order.amount),
            },
          ]
        : [];

  const imputationTotal = imputations.reduce((s, l) => s + l.raw, 0);
  const paymentTotal = payments.reduce((s, l) => s + l.raw, 0);
  const number = erpPaymentOrderNumber(order.id, order.number);

  const buffer = await renderToBuffer(
    ErpPaymentOrderDocument({
      number,
      vendor: order.vendor.name,
      issuedAt: displayDate(order.issuedAt),
      imputations,
      imputationTotal: money(imputationTotal),
      payments,
      paymentTotal: money(paymentTotal),
      paymentTotalRaw: paymentTotal,
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="OP-${number}.pdf"`,
    },
  });
}
