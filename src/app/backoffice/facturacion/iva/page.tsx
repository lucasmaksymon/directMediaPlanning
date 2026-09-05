import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader } from "@/components/ui";
import { FacturasIvaTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { createErpPurchaseInvoice, updateErpPurchaseInvoice } from "@/app/actions/erp-billing";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { erpInputNumber, isoDate } from "@/lib/erp";

export const metadata = { title: productTitle("Facturas compra IVA") };

export default async function ErpFacturasIvaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [invoices, vendors, purchaseOrders, productionOrders] = await Promise.all([
    prisma.erpPurchaseInvoice.findMany({
      where: { isVatPurchase: true },
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        orderLinks: { select: { purchaseOrderId: true, productionOrderId: true } },
      },
      take: 200,
    }),
    prisma.erpVendor.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    prisma.erpPurchaseOrder.findMany({
      include: { vendor: { select: { name: true } }, saleOrder: { select: { number: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.erpProductionOrder.findMany({
      include: { vendor: { select: { name: true } }, saleOrder: { select: { number: true } } },
      orderBy: { issuedAt: "desc" },
    }),
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
        description="Factura de compra IVA (compraIva=1) con comisión. Entra aparte en el informe mensual."
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
              placeholder="Buscar orden…"
              required
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
          <ErpField htmlFor="amount" label="Importe">
            <Input defaultValue={erpInputNumber(current?.amount)} id="amount" name="amount" />
          </ErpField>
          <ErpField htmlFor="vat" label="IVA">
            <Input defaultValue={erpInputNumber(current?.vat)} id="vat" name="vat" />
          </ErpField>
          <ErpField htmlFor="commission" label="Comisión">
            <Input defaultValue={erpInputNumber(current?.commission)} id="commission" name="commission" />
          </ErpField>
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
