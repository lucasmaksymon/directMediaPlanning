import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { OrdenesCompraTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpSettlementField } from "@/components/erp/ErpSettlementField";
import { createErpProductionOrder, updateErpProductionOrder } from "@/app/actions/erp-orders";
import { ERP_VENDOR, erpInputNumber, isoDate } from "@/lib/erp";
import { ERP_ORDER_ESTADOS } from "@/lib/erp-write";

export const metadata = { title: productTitle("O. Producción") };

export default async function ErpOProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [orders, saleOrders, vendors] = await Promise.all([
    prisma.erpProductionOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        saleOrder: { select: { number: true, client: { select: { name: true } } } },
      },
      take: 200,
    }),
    prisma.erpSaleOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } } },
      take: 200,
    }),
    prisma.erpVendor.findMany({
      where: { estado: 1, kind: ERP_VENDOR.producer },
      orderBy: { name: "asc" },
    }),
  ]);
  const current = orders.find((o) => o.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden al productor, atada a una O.P. de venta."
        eyebrow="Órdenes"
        title="O. Producción"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpProductionOrder : createErpProductionOrder}
          cancelHref={current ? "/backoffice/ordenes/produccion" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar orden de producción" : "Nueva orden de producción"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="saleOrderId" label="O.P. venta">
            <Select defaultValue={current?.saleOrderId} id="saleOrderId" name="saleOrderId" required>
              <option value="">Seleccioná</option>
              {saleOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number} · {o.client.name}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="vendorId" label="Productor">
            <Select defaultValue={current?.vendorId} id="vendorId" name="vendorId" required>
              <option value="">Seleccioná</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="number" label="Número">
            <Input defaultValue={current?.number} id="number" name="number" required />
          </ErpField>
          <ErpField htmlFor="issuedAt" label="Fecha">
            <Input defaultValue={isoDate(current?.issuedAt ?? now)} id="issuedAt" name="issuedAt" type="date" />
          </ErpField>
          <ErpField htmlFor="estado" label="Estado">
            <Select defaultValue={String(current?.estado ?? 1)} id="estado" name="estado">
              {ERP_ORDER_ESTADOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="net" label="Neto">
            <Input defaultValue={erpInputNumber(current?.net)} id="net" name="net" />
          </ErpField>
          <ErpField htmlFor="vat" label="IVA">
            <Input defaultValue={erpInputNumber(current?.vat)} id="vat" name="vat" />
          </ErpField>
          <ErpSettlementField cashPayment={current?.cashPayment} />
        </ErpForm>

        {orders.length === 0 ? (
          <EmptyState description="No hay órdenes de producción." title="Sin O. producción" />
        ) : (
          <OrdenesCompraTable
            kind="produccion"
            rows={orders.map((o) => ({
              id: o.id,
              number: o.number,
              saleNumber: o.saleOrder.number,
              client: o.saleOrder.client.name,
              vendor: o.vendor.name,
              issuedAt: o.issuedAt,
              amount: Number(o.amount),
              estado: o.estado,
              cashPayment: o.cashPayment,
            }))}
          />
        )}
      </div>
    </div>
  );
}
