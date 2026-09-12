import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { FacturasVentaTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { createErpSaleInvoice, updateErpSaleInvoice } from "@/app/actions/erp-billing";
import { ErpSaleInvoiceFormFields } from "@/components/erp/ocr/ErpSaleInvoiceFormFields";
import { ErpOcrImportClient } from "@/components/erp/ocr/ErpOcrImportClient";
import {
  erpInputNumber,
  erpReceiptRef,
  isoDate,
  money,
  saleOrderInvoiceCover,
  saleOrderPickLabel,
  saleOrderRemaining,
} from "@/lib/erp";
import { listOpenSaleOrdersForPick } from "@/lib/erp-list";

export const metadata = { title: productTitle("Facturas de venta") };

export default async function ErpFacturasVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const currentHint = edit
    ? await prisma.erpSaleInvoice.findUnique({ where: { id: edit }, select: { saleOrderId: true } })
    : null;
  const [invoices, allOrders, receipts] = await Promise.all([
    prisma.erpSaleInvoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } }, saleOrder: { select: { number: true, client: { select: { name: true } } } } },
      take: 200,
    }),
    listOpenSaleOrdersForPick(currentHint?.saleOrderId),
    prisma.erpSaleReceipt.findMany({
      orderBy: { issuedAt: "desc" },
      select: { id: true, number: true, amount: true, clientId: true, client: { select: { name: true } } },
      take: 80,
    }),
  ]);
  const current = invoices.find((f) => f.id === edit);
  const orderOptions = allOrders;

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Podés cargar varias facturas sobre la misma O.P. (por show). La orden pasa a Facturada cuando la suma cubre el total; si se borra y ya no cubre, se reabre."
        eyebrow="Facturación"
        title="Facturas de venta"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpSaleInvoice : createErpSaleInvoice}
          cancelHref={current ? "/backoffice/facturacion/venta" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar factura de venta" : "Nueva factura de venta"}
        >
          <ErpSaleInvoiceFormFields
            allowOcr={!current}
            current={
              current
                ? {
                    id: current.id,
                    saleOrderId: current.saleOrderId,
                    legalName: current.legalName,
                    receiptRef: current.receiptRef,
                    amount: erpInputNumber(current.amount),
                    vat: erpInputNumber(current.vat),
                    issuedAt: isoDate(current.issuedAt),
                    docType: current.docType,
                    pos: current.pos,
                    number: current.number,
                    detail: current.detail,
                    collectStatus: current.collectStatus,
                    collected: erpInputNumber(current.collected),
                    echeq: erpInputNumber(current.echeq),
                    bank: erpInputNumber(current.bank),
                    attachmentUrl: current.attachmentUrl,
                    retGan: erpInputNumber(current.retGan),
                    retVat: erpInputNumber(current.retVat),
                    retSuss: erpInputNumber(current.retSuss),
                    retIibb: erpInputNumber(current.retIibb),
                  }
                : null
            }
            now={isoDate(now)}
            orders={orderOptions.map((o) => {
              const invoiced = saleOrderInvoiceCover(o.invoices);
              const remaining = saleOrderRemaining(o, invoiced);
              return {
                id: o.id,
                label: saleOrderPickLabel(o, remaining),
                clientId: o.clientId,
                legalName: o.client.legalName?.trim() || o.client.name,
                net: Number(o.net),
                vat: Number(o.vat),
                remainingNet: remaining.net,
                remainingVat: remaining.vat,
                remainingAmount: remaining.amount,
                invoicedAmount: invoiced.amount + invoiced.vat,
                orderAmount: Number(o.amount),
              };
            })}
            receipts={receipts.map((r) => ({
              clientId: r.clientId,
              ref: erpReceiptRef(r.number),
              label: `${erpReceiptRef(r.number)} · ${r.client.name} · ${money(r.amount)}`,
            }))}
          />
        </ErpForm>
        <ErpOcrImportClient
          kind="sale_invoice"
          saleOrders={allOrders.map((o) => {
            const remaining = saleOrderRemaining(o, saleOrderInvoiceCover(o.invoices));
            return { value: o.id, label: saleOrderPickLabel(o, remaining) };
          })}
        />

        {invoices.length === 0 ? (
          <div className="contents">
            <div className="flex justify-end gap-2" data-erp-page-toolbar />
            <EmptyState description="No hay facturas de venta." title="Sin facturas" />
          </div>
        ) : (
          <FacturasVentaTable
            rows={invoices.map((f) => ({
              id: f.id,
              docType: f.docType,
              pos: f.pos,
              number: f.number,
              client: f.client.name,
              order: f.saleOrder.number,
              issuedAt: f.issuedAt,
              dueAt: f.dueAt,
              total: Number(f.amount) + Number(f.vat),
              collectStatus: f.collectStatus,
            }))}
          />
        )}
      </div>
    </div>
  );
}
