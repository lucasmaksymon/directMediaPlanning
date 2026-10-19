import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader } from "@/components/ui";
import { FacturasIvaTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpVatCommissionFields } from "@/components/erp/ErpVatCommissionFields";
import { createErpPurchaseInvoice, updateErpPurchaseInvoice } from "@/app/actions/erp-billing";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { erpInputNumber, isoDate } from "@/lib/erp";
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
      id: o.id,
      label: `Compra ${o.number} · ${o.saleOrder.number} · ${o.vendor.name}`,
    })),
    ...productionOrders.map((o) => ({
      id: o.id,
      label: `Producción ${o.number} · ${o.saleOrder.number} · ${o.vendor.name}`,
    })),
  ];

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="La comisión (10,5% del total, más un recargo si hace falta) entra como gasto del mes. No se resta de la orden."
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
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <input name="isVatPurchase" type="hidden" value="1" />
          <ErpField htmlFor="vendorId" label="Proveedor">
            <Autocomplete
              defaultValue={current?.vendorId}
              id="vendorId"
              name="vendorId"
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              placeholder="Buscar proveedor…"
              required
            />
          </ErpField>
          <ErpField htmlFor="orderId" label="Orden de compra o producción">
            <Autocomplete
              defaultValue={currentOrderId}
              id="orderId"
              name="orderId"
              options={openOrders.map((o) => ({ value: o.id, label: o.label }))}
              placeholder="Opcional"
            />
          </ErpField>
          <ErpField htmlFor="issuedAt" label="Fecha">
            <Input defaultValue={isoDate(current?.issuedAt ?? now)} id="issuedAt" name="issuedAt" type="date" />
          </ErpField>
          <ErpField htmlFor="docType" label="Tipo">
            <ErpDocTypeSelect defaultValue={current?.docType} />
          </ErpField>
          <ErpField htmlFor="pos" label="Punto">
            <Input defaultValue={current?.pos ?? 1} id="pos" name="pos" type="number" />
          </ErpField>
          <ErpField htmlFor="number" label="Número">
            <Input defaultValue={current?.number} id="number" name="number" required type="number" />
          </ErpField>
          <ErpVatCommissionFields
            amount={erpInputNumber(current?.amount)}
            commission={erpInputNumber(current?.commission)}
            vat={erpInputNumber(current?.vat)}
          />
        </ErpForm>

        {invoices.length === 0 ? (
          <EmptyState description="No hay facturas de compra IVA." title="Sin facturas IVA" />
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
