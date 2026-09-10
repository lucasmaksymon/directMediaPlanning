import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { OrdenesCompraTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { ErpSettlementField } from "@/components/erp/ErpSettlementField";
import { createErpPurchaseOrder, updateErpPurchaseOrder } from "@/app/actions/erp-orders";
import { ERP_VENDOR, erpInputNumber, isoDate } from "@/lib/erp";
import { ERP_ORDER_ESTADOS } from "@/lib/erp-write";
import { ERP_ADJUSTMENT_KINDS, ERP_ADJUSTMENT_LABELS, ERP_VAT_RATE } from "@/lib/erp-order-docs";
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
          include: { items: true, adjustments: { orderBy: { sortOrder: "asc" } } },
        })
      : Promise.resolve(null),
    listSaleOrdersForPick(),
    listActiveVendors(ERP_VENDOR.media),
    listErpElementsForSelect(),
    listErpPlazasForSelect(),
  ]);
  const plazaOptions = toErpPlazaSelectOptions(plazas);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden al medio, siempre atada a una O.P. de venta."
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
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="saleOrderId" label="O.P. venta">
            <Autocomplete
              defaultValue={current?.saleOrderId}
              id="saleOrderId"
              name="saleOrderId"
              options={saleOrders.map((o) => ({ value: o.id, label: `${o.number} · ${o.client.name}` }))}
              placeholder="Buscar orden…"
              required
            />
          </ErpField>
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
          <ErpField htmlFor="number" label="Número">
            <Input defaultValue={current?.number} id="number" name="number" required />
          </ErpField>
          <ErpField htmlFor="product" label="Producto">
            <Input defaultValue={current?.product ?? ""} id="product" name="product" />
          </ErpField>
          <ErpField htmlFor="media" label="Medio / elemento">
            <Input defaultValue={current?.media ?? ""} id="media" name="media" />
          </ErpField>
          <ErpField htmlFor="circuit" label="Circuito">
            <Input defaultValue={current?.circuit ?? ""} id="circuit" name="circuit" placeholder="Igual al número si no se aclara" />
          </ErpField>
          <ErpField htmlFor="support" label="Soporte">
            <Input defaultValue={current?.support ?? ""} id="support" name="support" placeholder="DIGITAL, TRADICIONAL…" />
          </ErpField>
          <ErpField htmlFor="plaza" label="Plaza">
            <Autocomplete
              defaultValue={current?.plaza ?? ""}
              creatable
              id="plaza"
              name="plaza"
              options={plazaOptions}
              placeholder="Buscar o crear…"
            />
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
          <ErpField htmlFor="days" label="Días">
            <Input defaultValue={current?.days != null ? String(current.days) : ""} id="days" name="days" inputMode="numeric" />
          </ErpField>
          <ErpField htmlFor="spotCount" label="Ubicaciones (cantidad)">
            <Input
              defaultValue={current?.spotCount != null ? String(current.spotCount) : ""}
              id="spotCount"
              inputMode="numeric"
              name="spotCount"
            />
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
          <ErpField htmlFor="costLabel" label="Leyenda del costo">
            <Input
              defaultValue={current?.costLabel ?? ""}
              id="costLabel"
              name="costLabel"
              placeholder="Costo 3 días en exclusivo y 3 en loop"
            />
          </ErpField>
          <ErpField htmlFor="grossNet" label="Costo neto total">
            <Input
              defaultValue={current ? erpInputNumber(current.grossNet) : ""}
              id="grossNet"
              name="grossNet"
              placeholder="Se suma del detalle si lo dejás vacío"
            />
          </ErpField>
          <ErpField htmlFor="vatRate" label="IVA %">
            <Input
              defaultValue={current ? erpInputNumber(current.vatRate) : String(ERP_VAT_RATE)}
              id="vatRate"
              name="vatRate"
              placeholder="0 si no lleva IVA discriminado"
            />
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
              {
                name: "element",
                label: "Elemento",
                placeholder: "Buscar o crear…",
                options: elements.map((e) => ({ value: e.name, label: e.name })),
                creatable: true,
              },
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
          <ErpLineList
            addLabel="Agregar ajuste"
            allowEmpty
            fields={[
              {
                name: "label",
                label: "Concepto",
                placeholder: "Buscar o crear…",
                options: ERP_ADJUSTMENT_LABELS.map((l) => ({ value: l, label: l })),
                creatable: true,
              },
              { name: "kind", label: "Tipo", type: "select", options: [...ERP_ADJUSTMENT_KINDS] },
              { name: "percent", label: "% sobre el costo", type: "number" },
              { name: "amount", label: "Importe", type: "number" },
            ]}
            prefix="aj"
            rows={
              current?.adjustments.map((adj) => ({
                id: adj.id,
                values: {
                  label: adj.label,
                  kind: String(adj.kind),
                  percent: adj.percent == null ? "" : erpInputNumber(adj.percent),
                  amount: erpInputNumber(adj.amount),
                },
              })) ?? []
            }
            title="Ajustes del cierre"
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
