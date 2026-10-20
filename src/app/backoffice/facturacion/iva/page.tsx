import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { FacturasIvaTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { createErpPurchaseInvoice, updateErpPurchaseInvoice } from "@/app/actions/erp-billing";
import { ErpVatPurchaseFormFields } from "@/components/erp/ocr/ErpVatPurchaseFormFields";
import { ErpOcrImportClient } from "@/components/erp/ocr/ErpOcrImportClient";
import { isoDate } from "@/lib/erp";
import { listActiveVendors, listRecentProductionOrdersForPick, listRecentPurchaseOrdersForPick } from "@/lib/erp-list";

export const metadata = { title: productTitle("Facturas compra IVA") };

export default async function ErpFacturasIvaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const select = {
    id: true,
    vendorId: true,
    issuedAt: true,
    dueAt: true,
    docType: true,
    pos: true,
    number: true,
    amount: true,
    vat: true,
    commission: true,
    attachmentUrl: true,
    vendor: { select: { name: true } },
    orderLinks: { select: { purchaseOrderId: true, productionOrderId: true } },
  } as const;
  const [invoices, vendors, purchaseOrders, productionOrders] = await Promise.all([
    prisma.erpPurchaseInvoice.findMany({
      where: { isVatPurchase: true },
      orderBy: { issuedAt: "desc" },
      select,
    }),
    listActiveVendors(),
    listRecentPurchaseOrdersForPick(),
    listRecentProductionOrdersForPick(),
  ]);
  const current = invoices.find((f) => f.id === edit);
  const currentOrderId = current?.orderLinks[0]?.purchaseOrderId ?? current?.orderLinks[0]?.productionOrderId ?? "";
  const openOrders = [
    ...purchaseOrders.map((o) => ({
      value: o.id,
      vendorId: o.vendorId,
      label: `Compra ${o.number} · ${o.saleOrder.number} · ${o.vendor.name}`,
    })),
    ...productionOrders.map((o) => ({
      value: o.id,
      vendorId: o.vendorId,
      label: `Producción ${o.number} · ${o.saleOrder.number} · ${o.vendor.name}`,
    })),
  ];
  const vendorOptions = vendors.map((v) => ({ value: v.id, label: v.name }));

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="La comisión (10,5% del neto, más un recargo si hace falta) entra como gasto del mes. No se resta de la orden."
        eyebrow="Facturación"
        title="Facturas de compra IVA"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpPurchaseInvoice : createErpPurchaseInvoice}
          cancelHref={current ? "/backoffice/facturacion/iva" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar factura IVA" : "Nueva factura IVA"}
        >
          <ErpVatPurchaseFormFields
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
                    amount: current.amount,
                    vat: current.vat,
                    commission: current.commission,
                    attachmentUrl: current.attachmentUrl,
                  }
                : null
            }
            now={isoDate(now)}
            orders={openOrders.map((o) => ({ value: o.value, label: o.label }))}
            vendors={vendorOptions}
          />
        </ErpForm>
        <ErpOcrImportClient
          kind="purchase_invoice"
          purchaseOrders={openOrders}
          vatPurchase
          vendors={vendorOptions}
        />

        {invoices.length === 0 ? (
          <div className="contents">
            <div className="flex justify-end gap-2" data-erp-page-toolbar />
            <EmptyState description="No hay facturas de compra IVA." title="Sin facturas IVA" />
          </div>
        ) : (
          <FacturasIvaTable
            rows={invoices.map((f) => ({
              id: f.id,
              docType: f.docType,
              pos: f.pos,
              number: f.number,
              vendor: f.vendor.name,
              issuedAt: f.issuedAt,
              total: Number(f.amount) + Number(f.vat),
              commission: Number(f.commission),
            }))}
          />
        )}
      </div>
    </div>
  );
}
