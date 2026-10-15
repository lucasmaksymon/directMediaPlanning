import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { OrdenesVentaTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpSaleOrderFormFields } from "@/components/erp/orders/ErpSaleOrderFormFields";
import { createErpSaleOrder, updateErpSaleOrder } from "@/app/actions/erp-orders";
import { erpCashMode, erpInputNumber, erpSettlementLabel, isoDate } from "@/lib/erp";
import { ERP_VAT_RATE, inferVatRate } from "@/lib/erp-order-docs";
import { ERP_ORDER_ESTADOS } from "@/lib/erp-write";
import { listErpElementsForSelect, listErpPlazasForSelect, toErpPlazaSelectOptions } from "@/lib/erp-catalog";
import { listActiveClients, listSaleOrdersForTable } from "@/lib/erp-list";

export const metadata = { title: productTitle("O.P. Venta") };

export default async function ErpOpVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [orders, current, clients, plazas, elements] = await Promise.all([
    listSaleOrdersForTable(),
    edit
      ? prisma.erpSaleOrder.findUnique({ where: { id: edit }, include: { items: true } })
      : Promise.resolve(null),
    listActiveClients(),
    listErpPlazasForSelect(),
    listErpElementsForSelect(),
  ]);
  const plazaOptions = toErpPlazaSelectOptions(plazas);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden de compra del cliente (OC … C). Subí el PDF para completarla. Importe = neto + IVA. Pasa a Facturada cuando las facturas cubren el total."
        eyebrow="Órdenes"
        title="O.P. Venta"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpSaleOrder : createErpSaleOrder}
          cancelHref={current ? "/backoffice/ordenes/venta" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar O.P. de venta" : "Nueva O.P. de venta"}
        >
          <ErpSaleOrderFormFields
            clients={clients.map((c) => ({ value: c.id, label: c.name }))}
            currentId={current?.id}
            elementOptions={elements.map((e) => ({ value: e.name, label: e.name }))}
            estados={ERP_ORDER_ESTADOS}
            initial={{
              clientId: current?.clientId ?? "",
              number: current?.number ?? "",
              product: current?.product ?? "",
              plaza: current?.plaza ?? "",
              issuedAt: isoDate(current?.issuedAt ?? now),
              month: String(current?.month ?? now.getMonth() + 1),
              year: String(current?.year ?? now.getFullYear()),
              periodLabel: current?.periodLabel ?? "",
              estado: String(current?.estado ?? 1),
              agencyFee: current?.agencyFee != null ? erpInputNumber(current.agencyFee) : "",
              net: current ? erpInputNumber(current.net) : "",
              vat: current ? erpInputNumber(current.vat) : "",
              vatRate: String(current ? inferVatRate(Number(current.net) - Number(current.cashAmount), Number(current.vat)) : ERP_VAT_RATE),
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
                    plaza: item.plaza ?? "",
                    quantity: erpInputNumber(item.quantity),
                    faces: erpInputNumber(item.faces),
                    days: item.days != null ? String(item.days) : "",
                    measures: item.measures ?? "",
                    unitCost: erpInputNumber(item.unitCost),
                    exhibitionNet: erpInputNumber(item.exhibitionNet),
                    bonusNet: erpInputNumber(item.bonusNet),
                    productionNet: erpInputNumber(item.productionNet),
                    startsAt: item.startsAt ? isoDate(item.startsAt) : "",
                    endsAt: item.endsAt ? isoDate(item.endsAt) : "",
                  },
                })) ?? [],
            }}
            plazaOptions={plazaOptions}
          />
        </ErpForm>

        {orders.length === 0 ? (
          <EmptyState description="No hay órdenes de venta." title="Sin O.P. venta" />
        ) : (
          <OrdenesVentaTable
            rows={orders.map((o) => ({
              id: o.id,
              number: o.number,
              client: o.client.name,
              product: o.product,
              month: o.month,
              year: o.year,
              issuedAt: o.issuedAt,
              items: o.items.map((i) => i.element).join(", "),
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
