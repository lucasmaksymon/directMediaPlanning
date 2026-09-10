import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { FacturasCompraTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { createErpPurchaseInvoice, updateErpPurchaseInvoice } from "@/app/actions/erp-billing";
import { ErpPurchaseInvoiceFormFields } from "@/components/erp/ocr/ErpPurchaseInvoiceFormFields";
import { ErpOcrImportClient } from "@/components/erp/ocr/ErpOcrImportClient";
import { ERP_ORDER, erpInputNumber, erpPurchaseInvoiceTotal, isoDate, money } from "@/lib/erp";
import { listActiveVendors, listOpenProductionOrdersForPick, listOpenPurchaseOrdersForPick } from "@/lib/erp-list";

export const metadata = { title: productTitle("Facturas de compra") };

export default async function ErpFacturasCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const currentHint = edit
    ? await prisma.erpPurchaseInvoice.findUnique({
        where: { id: edit },
        select: { orderLinks: { select: { purchaseOrderId: true, productionOrderId: true } } },
      })
    : null;
  const keepPo = currentHint?.orderLinks[0]?.purchaseOrderId ?? undefined;
  const keepPr = currentHint?.orderLinks[0]?.productionOrderId ?? undefined;
  const [invoices, vendors, purchaseOrders, productionOrders] = await Promise.all([
    prisma.erpPurchaseInvoice.findMany({
      where: { isVatPurchase: false },
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        orderLinks: { select: { purchaseOrderId: true, productionOrderId: true } },
      },
      take: 200,
    }),
    listActiveVendors(),
    listOpenPurchaseOrdersForPick(keepPo),
    listOpenProductionOrdersForPick(keepPr),
  ]);
  const current = invoices.find((f) => f.id === edit);
  const currentOrderId = current?.orderLinks[0]?.purchaseOrderId ?? current?.orderLinks[0]?.productionOrderId ?? "";
  const allOrders = [
    ...purchaseOrders.map((o) => ({
      id: o.id,
      vendorId: o.vendorId,
      estado: o.estado,
      label: `Compra ${o.number} · ${o.vendor.name}${o.estado === ERP_ORDER.invoiced ? " · Facturada" : ""}`,
      batchLabel: `Compra ${o.number} · ${o.vendor.name} · ${money(o.amount)}${o.estado === ERP_ORDER.invoiced ? " · Facturada" : ""}`,
    })),
    ...productionOrders.map((o) => ({
      id: o.id,
      vendorId: o.vendorId,
      estado: o.estado,
      label: `Producción ${o.number} · ${o.vendor.name}${o.estado === ERP_ORDER.invoiced ? " · Facturada" : ""}`,
      batchLabel: `Producción ${o.number} · ${o.vendor.name} · ${money(o.amount)}${o.estado === ERP_ORDER.invoiced ? " · Facturada" : ""}`,
    })),
  ];
  const openOrders = allOrders.filter(
    (o) =>
      o.estado === ERP_ORDER.issued || o.estado === ERP_ORDER.invoiced || o.id === currentOrderId,
  );

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Factura al proveedor. Incluye retenciones IVA / IIBB. Cierra la orden al cubrir el importe neto (facturas menos notas de crédito)."
        eyebrow="Facturación"
        title="Facturas de compra"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpPurchaseInvoice : createErpPurchaseInvoice}
          cancelHref={current ? "/backoffice/facturacion/compra" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar factura de compra" : "Nueva factura de compra"}
        >
          <ErpPurchaseInvoiceFormFields
            allowOcr={!current}
            current={
              current
                ? {
                    id: current.id,
                    vendorId: current.vendorId,
                    orderId: currentOrderId,
                    issuedAt: isoDate(current.issuedAt),
                    docType: current.docType,
                    pos: current.pos,
                    number: current.number,
                    amount: erpInputNumber(current.amount),
                    vat: erpInputNumber(current.vat),
                    vatWithholding: erpInputNumber(current.vatWithholding),
                    iibbCaba: erpInputNumber(current.iibbCaba),
                    iibbBsAs: erpInputNumber(current.iibbBsAs),
                    internalTax: erpInputNumber(current.internalTax),
                    nonTaxable: erpInputNumber(current.nonTaxable),
                    diegoFee: erpInputNumber(current.diegoFee),
                    isCreditNote: current.isCreditNote,
                    payStatus: current.payStatus,
                    attachmentUrl: current.attachmentUrl,
                  }
                : null
            }
            now={isoDate(now)}
            orders={openOrders.map((o) => ({ value: o.id, label: o.label, vendorId: o.vendorId }))}
            vendors={vendors.map((v) => ({ value: v.id, label: v.name }))}
          />
        </ErpForm>
        <ErpOcrImportClient
          kind="purchase_invoice"
          purchaseOrders={allOrders.map((o) => ({ value: o.id, label: o.batchLabel, vendorId: o.vendorId }))}
          vendors={vendors.map((v) => ({ value: v.id, label: v.name }))}
        />

        {invoices.length === 0 ? (
          <div className="contents">
            <div className="flex justify-end gap-2" data-erp-page-toolbar />
            <EmptyState description="No hay facturas de compra." title="Sin facturas" />
          </div>
        ) : (
          <FacturasCompraTable
            rows={invoices.map((f) => ({
              id: f.id,
              docType: f.docType,
              pos: f.pos,
              number: f.number,
              vendor: f.vendor.name,
              issuedAt: f.issuedAt,
              total: erpPurchaseInvoiceTotal(f),
              retenciones: Number(f.vatWithholding) + Number(f.iibbCaba) + Number(f.iibbBsAs),
              payStatus: f.payStatus,
              isCreditNote: f.isCreditNote,
            }))}
          />
        )}
      </div>
    </div>
  );
}
