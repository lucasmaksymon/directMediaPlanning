import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { OrdenesCompraTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpPurchaseOrderFormFields } from "@/components/erp/orders/ErpPurchaseOrderFormFields";
import { createErpPurchaseOrder, updateErpPurchaseOrder } from "@/app/actions/erp-orders";
import { ERP_VENDOR, erpCashMode, erpInputNumber, erpSettlementLabel, isoDate } from "@/lib/erp";
import { ERP_ORDER_ESTADOS } from "@/lib/erp-write";
import { ERP_VAT_RATE } from "@/lib/erp-order-docs";
import { listErpElementsForSelect, listErpPlazasForSelect, toErpPlazaSelectOptions } from "@/lib/erp-catalog";
import { listActiveVendors, listPurchaseOrdersForTable, listSaleOrdersForPick } from "@/lib/erp-list";

export const metadata = { title: productTitle("O.P. Compra") };

export default async function ErpOpCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [orders, current, saleOrders, vendors, elements, plazas] = await Promise.all([
    listPurchaseOrdersForTable(),
    edit
      ? prisma.erpPurchaseOrder.findUnique({
          where: { id: edit },
          include: {
            items: true,
            adjustments: { orderBy: { sortOrder: "asc" } },
            saleOrder: { select: { id: true, number: true, client: { select: { name: true } } } },
          },
        })
      : Promise.resolve(null),
    listSaleOrdersForPick(),
    listActiveVendors(ERP_VENDOR.media),
    listErpElementsForSelect(),
    listErpPlazasForSelect(),
  ]);
  const plazaOptions = toErpPlazaSelectOptions(plazas);
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
        description="Orden de publicidad al medio (OP … M), siempre atada a una O.P. de venta. Subí el PDF para completarla."
        eyebrow="Órdenes"
        title="O.P. Compra"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpPurchaseOrder : createErpPurchaseOrder}
          cancelHref={current ? "/backoffice/ordenes/compra" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar O.P. de compra" : "Nueva O.P. de compra"}
        >
          <ErpPurchaseOrderFormFields
            currentId={current?.id}
            elementOptions={elements.map((e) => ({ value: e.name, label: e.name }))}
            estados={ERP_ORDER_ESTADOS}
            initial={{
              saleOrderId: current?.saleOrderId ?? "",
              vendorId: current?.vendorId ?? "",
              number: current?.number ?? "",
              product: current?.product ?? "",
              media: current?.media ?? "",
              circuit: current?.circuit ?? "",
              support: current?.support ?? "",
              plaza: current?.plaza ?? "",
              measures: current?.measures ?? "",
              issuedAt: isoDate(current?.issuedAt ?? now),
              startsAt: current?.startsAt ? isoDate(current.startsAt) : "",
              endsAt: current?.endsAt ? isoDate(current.endsAt) : "",
              days: current?.days != null ? String(current.days) : "",
              spotCount: current?.spotCount != null ? String(current.spotCount) : "",
              paidQty: erpInputNumber(current?.paidQty),
              bonusQty: erpInputNumber(current?.bonusQty),
              unitCost: erpInputNumber(current?.unitCost),
              estado: String(current?.estado ?? 1),
              costLabel: current?.costLabel ?? "",
              grossNet: current ? erpInputNumber(current.grossNet) : "",
              vatRate: current ? erpInputNumber(current.vatRate) : String(ERP_VAT_RATE),
              printShop: current?.printShop ?? "",
              printSupport: current?.printSupport ?? "",
              cashMode: erpCashMode(Number(current?.net ?? 0), Number(current?.cashAmount ?? 0), current?.cashPayment ?? false),
              cashAmount: current && Number(current.cashAmount) > 0 ? erpInputNumber(current.cashAmount) : "",
              locations: current?.locations ?? "",
              observations: current?.observations ?? "",
              attachmentUrl: current?.attachmentUrl ?? "",
              items:
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
                })) ?? [],
              adjustments:
                current?.adjustments.map((adj) => ({
                  id: adj.id,
                  values: {
                    label: adj.label,
                    kind: String(adj.kind),
                    percent: adj.percent == null ? "" : erpInputNumber(adj.percent),
                    amount: erpInputNumber(adj.amount),
                  },
                })) ?? [],
            }}
            plazaOptions={plazaOptions}
            saleOrders={saleOrderOptions}
            vendors={vendors.map((v) => ({ value: v.id, label: v.name }))}
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
              settlement: erpSettlementLabel(o.cashPayment, Number(o.net), Number(o.cashAmount)),
            }))}
          />
        )}
      </div>
    </div>
  );
}
