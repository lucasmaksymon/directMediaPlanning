import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { OrdenesCompraTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpProductionOrderFormFields } from "@/components/erp/orders/ErpProductionOrderFormFields";
import { createErpProductionOrder, updateErpProductionOrder } from "@/app/actions/erp-orders";
import { ERP_VENDOR, erpCashMode, erpInputNumber, erpSettlementLabel, isoDate } from "@/lib/erp";
import { ERP_ORDER_ESTADOS } from "@/lib/erp-write";
import { ERP_VAT_RATE, inferVatRate } from "@/lib/erp-order-docs";
import { listActiveVendors, listProductionOrdersForTable, listSaleOrdersForPick } from "@/lib/erp-list";

export const metadata = { title: productTitle("O. Producción") };

export default async function ErpOProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [orders, current, saleOrders, vendors] = await Promise.all([
    listProductionOrdersForTable(),
    edit
      ? prisma.erpProductionOrder.findUnique({
          where: { id: edit },
          include: {
            items: true,
            deliveries: true,
            saleOrder: { select: { id: true, number: true, client: { select: { name: true } } } },
          },
        })
      : Promise.resolve(null),
    listSaleOrdersForPick(),
    listActiveVendors(ERP_VENDOR.producer),
  ]);
  const saleOrderOptions = saleOrders.map((o) => ({ value: o.id, label: `${o.number} · ${o.client.name}` }));
  if (current && !saleOrderOptions.some((o) => o.value === current.saleOrderId)) {
    saleOrderOptions.unshift({
      value: current.saleOrder.id,
      label: `${current.saleOrder.number} · ${current.saleOrder.client.name}`,
    });
  }

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden al productor (OP … P), atada a una O.P. de venta. Subí el PDF para completarla."
        eyebrow="Órdenes"
        title="O. Producción"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpProductionOrder : createErpProductionOrder}
          cancelHref={current ? "/backoffice/ordenes/produccion" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar orden de producción" : "Nueva orden de producción"}
        >
          <ErpProductionOrderFormFields
            currentId={current?.id}
            estados={ERP_ORDER_ESTADOS}
            initial={{
              saleOrderId: current?.saleOrderId ?? "",
              vendorId: current?.vendorId ?? "",
              number: current?.number ?? "",
              product: current?.product ?? "",
              measures: current?.measures ?? "",
              printSupport: current?.printSupport ?? "",
              quantity: erpInputNumber(current?.quantity),
              motifs: current?.motifs ?? "",
              unitCost: erpInputNumber(current?.unitCost),
              invoiceDetail: current?.invoiceDetail ?? "",
              issuedAt: isoDate(current?.issuedAt ?? now),
              estado: String(current?.estado ?? 1),
              net: current ? erpInputNumber(current.net) : "",
              vat: current ? erpInputNumber(current.vat) : "",
              vatRate: String(current ? inferVatRate(Number(current.net) - Number(current.cashAmount), Number(current.vat)) : ERP_VAT_RATE),
              colorProof: current?.colorProof ?? "",
              pickup: current?.pickup ?? "",
              cashMode: erpCashMode(Number(current?.net ?? 0), Number(current?.cashAmount ?? 0), current?.cashPayment ?? false),
              cashAmount: current && Number(current.cashAmount) > 0 ? erpInputNumber(current.cashAmount) : "",
              observations: current?.observations ?? "",
              attachmentUrl: current?.attachmentUrl ?? "",
              items:
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
                })) ?? [],
              deliveries:
                current?.deliveries.map((d) => ({
                  id: d.id,
                  values: {
                    destination: d.destination,
                    quantity: erpInputNumber(d.quantity),
                  },
                })) ?? [],
            }}
            saleOrders={saleOrderOptions}
            vendors={vendors.map((v) => ({ value: v.id, label: v.name }))}
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
              settlement: erpSettlementLabel(o.cashPayment, Number(o.net), Number(o.cashAmount)),
            }))}
          />
        )}
      </div>
    </div>
  );
}
