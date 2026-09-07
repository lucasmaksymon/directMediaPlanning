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
import { ERP_ORDER, erpInputNumber, erpReceiptRef, isoDate, money } from "@/lib/erp";

export const metadata = { title: productTitle("Facturas de venta") };

export default async function ErpFacturasVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [invoices, allOrders, receipts] = await Promise.all([
    prisma.erpSaleInvoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } }, saleOrder: { select: { number: true, client: { select: { name: true } } } } },
      take: 200,
    }),
    prisma.erpSaleOrder.findMany({
      where: { estado: { in: [ERP_ORDER.issued, ERP_ORDER.invoiced] } },
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true, legalName: true } } },
    }),
    prisma.erpSaleReceipt.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } } },
      take: 300,
    }),
  ]);
  const current = invoices.find((f) => f.id === edit);
  const orderOptions = allOrders.filter(
    (o) => o.estado === ERP_ORDER.issued || o.id === current?.saleOrderId,
  );

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Si la suma de importe + IVA cubre la orden, la O.P. pasa a estado Facturada. Si se borra y ya no cubre, se reabre."
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
            orders={orderOptions.map((o) => ({
              id: o.id,
              label: `${o.number} · ${o.client.name} · ${money(o.amount)}`,
              clientId: o.clientId,
              legalName: o.client.legalName?.trim() || o.client.name,
              net: Number(o.net),
              vat: Number(o.vat),
            }))}
            receipts={receipts.map((r) => ({
              clientId: r.clientId,
              ref: erpReceiptRef(r.number),
              label: `${erpReceiptRef(r.number)} · ${r.client.name} · ${money(r.amount)}`,
            }))}
          />
        </ErpForm>
        <ErpOcrImportClient
          kind="sale_invoice"
          saleOrders={allOrders.map((o) => ({
            value: o.id,
            label: `${o.number} · ${o.client.name} · ${money(o.amount)}`,
          }))}
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
