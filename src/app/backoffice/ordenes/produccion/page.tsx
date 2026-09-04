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
        saleOrder: { select: { number: true, product: true, client: { select: { name: true } } } },
        items: true,
        deliveries: true,
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
          <ErpField htmlFor="product" label="Producto">
            <Input defaultValue={current?.product ?? ""} id="product" name="product" />
          </ErpField>
          <ErpField htmlFor="measures" label="Medidas">
            <Input defaultValue={current?.measures ?? ""} id="measures" name="measures" />
          </ErpField>
          <ErpField htmlFor="printSupport" label="Soporte impresión">
            <Input defaultValue={current?.printSupport ?? ""} id="printSupport" name="printSupport" />
          </ErpField>
          <ErpField htmlFor="quantity" label="Cantidad">
            <Input defaultValue={erpInputNumber(current?.quantity)} id="quantity" name="quantity" />
          </ErpField>
          <ErpField htmlFor="motifs" label="Motivos">
            <Input defaultValue={current?.motifs ?? ""} id="motifs" name="motifs" />
          </ErpField>
          <ErpField htmlFor="unitCost" label="Precio unitario">
            <Input defaultValue={erpInputNumber(current?.unitCost)} id="unitCost" name="unitCost" />
          </ErpField>
          <ErpField htmlFor="invoiceDetail" label="Detalle FC">
            <Input defaultValue={current?.invoiceDetail ?? ""} id="invoiceDetail" name="invoiceDetail" />
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
          <ErpField htmlFor="colorProof" label="Prueba color">
            <Input defaultValue={current?.colorProof ?? ""} id="colorProof" name="colorProof" />
          </ErpField>
          <ErpField htmlFor="pickup" label="Retiro material" wide>
            <Input defaultValue={current?.pickup ?? ""} id="pickup" name="pickup" />
          </ErpField>
          <ErpSettlementField cashPayment={current?.cashPayment} />
          <ErpField htmlFor="observations" label="Observaciones" wide>
            <Textarea defaultValue={current?.observations ?? ""} id="observations" name="observations" rows={3} />
          </ErpField>
          <ErpLineList
            addLabel="Agregar dispositivo"
            fields={[
              { name: "element", label: "Dispositivo" },
              { name: "location", label: "Dirección" },
              { name: "quantity", label: "Cantidad", type: "number" },
              { name: "measures", label: "Medidas" },
              { name: "printSupport", label: "Soporte" },
              { name: "net", label: "Costo", type: "number" },
            ]}
            prefix="pr"
            rows={
              current?.items.map((item) => ({
                id: item.id,
                values: {
                  element: item.element,
                  location: item.location ?? "",
                  quantity: erpInputNumber(item.quantity),
                  measures: item.measures ?? "",
                  printSupport: item.printSupport ?? "",
                  net: erpInputNumber(item.net),
                },
              })) ?? []
            }
            title="Dispositivos"
          />
          <ErpLineList
            addLabel="Agregar destino"
            fields={[
              { name: "destination", label: "Destino" },
              { name: "quantity", label: "Cantidad", type: "number" },
            ]}
            prefix="dl"
            rows={
              current?.deliveries.map((d) => ({
                id: d.id,
                values: {
                  destination: d.destination,
                  quantity: erpInputNumber(d.quantity),
                },
              })) ?? []
            }
            title="Retiro / destinos"
          />
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
