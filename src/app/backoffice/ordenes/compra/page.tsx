import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { OrdenesCompraTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { ErpSettlementField } from "@/components/erp/ErpSettlementField";
import { createErpPurchaseOrder, updateErpPurchaseOrder } from "@/app/actions/erp-orders";
import { ERP_VENDOR, erpInputNumber, isoDate } from "@/lib/erp";
import { ERP_ORDER_ESTADOS } from "@/lib/erp-write";

export const metadata = { title: productTitle("O.P. Compra") };

export default async function ErpOpCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [orders, saleOrders, vendors] = await Promise.all([
    prisma.erpPurchaseOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        saleOrder: { select: { number: true, product: true, client: { select: { name: true } } } },
        items: true,
      },
      take: 200,
    }),
    prisma.erpSaleOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } } },
      take: 200,
    }),
    prisma.erpVendor.findMany({
      where: { estado: 1, kind: ERP_VENDOR.media },
      orderBy: { name: "asc" },
    }),
  ]);
  const current = orders.find((o) => o.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden al medio, siempre atada a una O.P. de venta."
        eyebrow="Órdenes"
        title="O.P. Compra"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpPurchaseOrder : createErpPurchaseOrder}
          cancelHref={current ? "/backoffice/ordenes/compra" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar O.P. de compra" : "Nueva O.P. de compra"}
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
          <ErpField htmlFor="vendorId" label="Proveedor">
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
          <ErpField htmlFor="product" label="Producto">
            <Input defaultValue={current?.product ?? ""} id="product" name="product" />
          </ErpField>
          <ErpField htmlFor="media" label="Medio / elemento">
            <Input defaultValue={current?.media ?? ""} id="media" name="media" />
          </ErpField>
          <ErpField htmlFor="measures" label="Medidas">
            <Input defaultValue={current?.measures ?? ""} id="measures" name="measures" />
          </ErpField>
          <ErpField htmlFor="issuedAt" label="Fecha">
            <Input defaultValue={isoDate(current?.issuedAt ?? now)} id="issuedAt" name="issuedAt" type="date" />
          </ErpField>
          <ErpField htmlFor="startsAt" label="Desde">
            <Input defaultValue={current?.startsAt ? isoDate(current.startsAt) : ""} id="startsAt" name="startsAt" type="date" />
          </ErpField>
          <ErpField htmlFor="endsAt" label="Hasta">
            <Input defaultValue={current?.endsAt ? isoDate(current.endsAt) : ""} id="endsAt" name="endsAt" type="date" />
          </ErpField>
          <ErpField htmlFor="paidQty" label="Elementos pagos">
            <Input defaultValue={erpInputNumber(current?.paidQty)} id="paidQty" name="paidQty" />
          </ErpField>
          <ErpField htmlFor="bonusQty" label="Bonificados">
            <Input defaultValue={erpInputNumber(current?.bonusQty)} id="bonusQty" name="bonusQty" />
          </ErpField>
          <ErpField htmlFor="unitCost" label="Costo unitario">
            <Input defaultValue={erpInputNumber(current?.unitCost)} id="unitCost" name="unitCost" />
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
          <ErpField htmlFor="printShop" label="Imprenta">
            <Input defaultValue={current?.printShop ?? ""} id="printShop" name="printShop" />
          </ErpField>
          <ErpField htmlFor="printSupport" label="Soporte impresión">
            <Input defaultValue={current?.printSupport ?? ""} id="printSupport" name="printSupport" />
          </ErpField>
          <ErpSettlementField cashPayment={current?.cashPayment} />
          <ErpField htmlFor="locations" label="Ubicaciones / circuito" wide>
            <Textarea defaultValue={current?.locations ?? ""} id="locations" name="locations" rows={2} />
          </ErpField>
          <ErpField htmlFor="observations" label="Observaciones" wide>
            <Textarea defaultValue={current?.observations ?? ""} id="observations" name="observations" rows={3} />
          </ErpField>
          <ErpLineList
            addLabel="Agregar línea"
            fields={[
              { name: "element", label: "Elemento", placeholder: "MUPIS, LED…" },
              { name: "location", label: "Ubicación" },
              { name: "quantity", label: "Cantidad", type: "number" },
              { name: "days", label: "Días", type: "number" },
              { name: "measures", label: "Medidas" },
              { name: "unitCost", label: "Costo unitario", type: "number" },
              { name: "net", label: "Costo neto", type: "number" },
            ]}
            prefix="po"
            rows={
              current?.items.map((item) => ({
                id: item.id,
                values: {
                  element: item.element,
                  location: item.location ?? "",
                  quantity: erpInputNumber(item.quantity),
                  days: item.days != null ? String(item.days) : "",
                  measures: item.measures ?? "",
                  unitCost: erpInputNumber(item.unitCost),
                  net: erpInputNumber(item.net),
                },
              })) ?? []
            }
            title="Detalle de pauta"
          />
        </ErpForm>

        {orders.length === 0 ? (
          <EmptyState description="No hay órdenes de compra." title="Sin O.P. compra" />
        ) : (
          <OrdenesCompraTable
            kind="compra"
            rows={orders.map((o) => ({
              id: o.id,
              number: o.number,
              saleNumber: o.saleOrder.number,
              client: o.saleOrder.client.name,
              product: o.product ?? o.saleOrder.product,
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
