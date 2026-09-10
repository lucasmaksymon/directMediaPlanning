import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { OrdenesVentaTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { ErpSettlementField } from "@/components/erp/ErpSettlementField";
import { createErpSaleOrder, updateErpSaleOrder } from "@/app/actions/erp-orders";
import { ERP_MONTHS, erpInputNumber, isoDate } from "@/lib/erp";
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
        description="Orden de publicidad de venta. Importe = neto + IVA. Pasa a Facturada cuando las facturas cubren el total."
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
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="clientId" label="Cliente">
            <Autocomplete
              defaultValue={current?.clientId}
              id="clientId"
              name="clientId"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Buscar cliente…"
              required
            />
          </ErpField>
          <ErpField htmlFor="number" label="Número">
            <Input defaultValue={current?.number} id="number" name="number" required />
          </ErpField>
          <ErpField htmlFor="product" label="Producto / campaña">
            <Input defaultValue={current?.product ?? ""} id="product" name="product" />
          </ErpField>
          <ErpField htmlFor="plaza" label="Plaza">
            <Autocomplete
              creatable
              createNoun="plaza"
              defaultValue={current?.plaza ?? ""}
              id="plaza"
              name="plaza"
              options={plazaOptions}
              placeholder="Buscar o crear… ej. Pilar (Buenos Aires)"
            />
          </ErpField>
          <ErpField htmlFor="issuedAt" label="Fecha">
            <Input defaultValue={isoDate(current?.issuedAt ?? now)} id="issuedAt" name="issuedAt" type="date" />
          </ErpField>
          <ErpField htmlFor="month" label="Mes">
            <Select defaultValue={String(current?.month ?? now.getMonth() + 1)} id="month" name="month">
              {ERP_MONTHS.slice(1).map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="year" label="Año">
            <Input defaultValue={current?.year ?? now.getFullYear()} id="year" name="year" type="number" />
          </ErpField>
          <ErpField htmlFor="periodLabel" label="Período (texto)">
            <Input defaultValue={current?.periodLabel ?? ""} id="periodLabel" name="periodLabel" placeholder="08 de septiembre al 08 de octubre" />
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
          <ErpField htmlFor="agencyFee" label="Servicio agencia %">
            <Input defaultValue={current?.agencyFee != null ? erpInputNumber(current.agencyFee) : ""} id="agencyFee" name="agencyFee" placeholder="Del cliente si vacío" />
          </ErpField>
          <ErpField htmlFor="net" label="Neto">
            <Input defaultValue={erpInputNumber(current?.net)} id="net" name="net" />
          </ErpField>
          <ErpField htmlFor="vat" label="IVA">
            <Input defaultValue={erpInputNumber(current?.vat)} id="vat" name="vat" />
          </ErpField>
          <ErpSettlementField cashPayment={current?.cashPayment} />
          <ErpField htmlFor="observations" label="Observaciones" wide>
            <Textarea defaultValue={current?.observations ?? ""} id="observations" name="observations" rows={3} />
          </ErpField>
          <ErpLineList
            addLabel="Agregar ítem"
            fields={[
              {
                name: "element",
                label: "Elemento",
                placeholder: "Buscar o crear…",
                options: elements.map((e) => ({ value: e.name, label: e.name })),
                creatable: true,
              },
              {
                name: "location",
                label: "Plaza",
                placeholder: "Buscar o crear… ej. Pilar (Buenos Aires)",
                options: plazaOptions,
                creatable: true,
              },
              { name: "plaza", label: "Ubicación", placeholder: "Av. Libertador y…" },
              { name: "quantity", label: "Cantidad", type: "number" },
              { name: "faces", label: "Caras", type: "number" },
              { name: "days", label: "Días", type: "number" },
              { name: "measures", label: "Medidas / spots" },
              { name: "unitCost", label: "Costo unitario", type: "number" },
              { name: "exhibitionNet", label: "Costo exhibición", type: "number" },
              { name: "bonusNet", label: "Bonificados", type: "number" },
              { name: "productionNet", label: "Costo producción", type: "number" },
              { name: "startsAt", label: "Desde", type: "date" },
              { name: "endsAt", label: "Hasta", type: "date" },
            ]}
            prefix="ci"
            rows={
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
              })) ?? []
            }
            title="Ítems de campaña"
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
            }))}
          />
        )}
      </div>
    </div>
  );
}
