import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import {
  createErpCampaignItem,
  createErpSaleOrder,
  deleteErpCampaignItem,
  deleteErpSaleOrder,
  updateErpSaleOrder,
} from "@/app/actions/erp-orders";
import {
  displayDate,
  ERP_MONTHS,
  erpInputNumber,
  erpOrderBadge,
  erpOrderLabel,
  isoDate,
  money,
} from "@/lib/erp";
import { ERP_ORDER_ESTADOS } from "@/lib/erp-write";
import { listErpElementsForSelect, listErpPlazasForSelect } from "@/lib/erp-catalog";

export const metadata = { title: productTitle("O.P. Venta") };

export default async function ErpOpVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [orders, clients, plazas, elements] = await Promise.all([
    prisma.erpSaleOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } }, items: true },
      take: 200,
    }),
    prisma.erpClient.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    listErpPlazasForSelect(),
    listErpElementsForSelect(),
  ]);
  const current = orders.find((o) => o.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden de publicidad de venta. Importe = neto + IVA. Pasa a Facturada cuando las facturas cubren el total."
        eyebrow="Órdenes"
        title="O.P. Venta"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
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
            <Select defaultValue={current?.clientId} id="clientId" name="clientId" required>
              <option value="">Seleccioná</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
        </ErpForm>

        {current ? (
          <div className="space-y-3">
            <h2 className="nm-section-title">Ítems de campaña</h2>
            <ErpForm
              action={createErpCampaignItem}
              openLabel="Agregar ítem"
              submitLabel="Agregar ítem"
              title="Elemento, plaza y período"
            >
              <input name="saleOrderId" type="hidden" value={current.id} />
              <ErpField htmlFor="element" label="Elemento">
                {elements.length > 0 ? (
                  <Select id="element" name="element" required>
                    <option value="">Seleccioná</option>
                    {elements.map((e) => (
                      <option key={e.id} value={e.name}>
                        {e.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input id="element" name="element" placeholder="CPM, MUPIS, LED…" required />
                )}
              </ErpField>
              <ErpField htmlFor="location" label="Plaza">
                {plazas.length > 0 ? (
                  <Select id="location" name="location">
                    <option value="">Seleccioná</option>
                    {plazas.map((p) => (
                      <optgroup key={p.province} label={p.province}>
                        {p.cities.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                ) : (
                  <Input id="location" name="location" placeholder="CABA, Vicente López…" />
                )}
              </ErpField>
              <ErpField htmlFor="quantity" label="Cantidad">
                <Input defaultValue="0" id="quantity" name="quantity" />
              </ErpField>
              <ErpField htmlFor="startsAt" label="Desde">
                <Input id="startsAt" name="startsAt" type="date" />
              </ErpField>
              <ErpField htmlFor="endsAt" label="Hasta">
                <Input id="endsAt" name="endsAt" type="date" />
              </ErpField>
            </ErpForm>
            {current.items.length > 0 ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Elemento</TH>
                    <TH>Ubicación</TH>
                    <TH>Cant.</TH>
                    <TH>Período</TH>
                    <TH className="text-right">Acciones</TH>
                  </TR>
                </THead>
                <TBody>
                  {current.items.map((item) => (
                    <TR key={item.id}>
                      <TD className="font-medium">{item.element}</TD>
                      <TD>{item.location ?? "—"}</TD>
                      <TD className="tabular-nums">{Number(item.quantity)}</TD>
                      <TD className="text-xs text-muted-foreground">
                        {item.startsAt ? displayDate(item.startsAt) : "—"}
                        {item.endsAt ? ` → ${displayDate(item.endsAt)}` : ""}
                      </TD>
                      <TD>
                        <ErpRowActions
                          deleteAction={deleteErpCampaignItem.bind(null, item.id)}
                          deleteConfirm="¿Borrar este ítem?"
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : null}
          </div>
        ) : null}

        {orders.length === 0 ? (
          <EmptyState description="No hay órdenes de venta." title="Sin O.P. venta" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Número</TH>
                <TH>Cliente</TH>
                <TH>Período</TH>
                <TH>Fecha</TH>
                <TH>Ítems</TH>
                <TH>Importe</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD className="font-medium">{o.number}</TD>
                  <TD>{o.client.name}</TD>
                  <TD>
                    {ERP_MONTHS[o.month]} {o.year}
                  </TD>
                  <TD>{displayDate(o.issuedAt)}</TD>
                  <TD className="text-xs text-muted-foreground">
                    {o.items.length === 0 ? "—" : o.items.map((i) => i.element).join(", ")}
                  </TD>
                  <TD className="tabular-nums">{money(o.amount)}</TD>
                  <TD>
                    <Badge variant={erpOrderBadge(o.estado)}>{erpOrderLabel(o.estado)}</Badge>
                  </TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpSaleOrder.bind(null, o.id)}
                      deleteConfirm={`¿Borrar la O.P. ${o.number}?`}
                      editHref={`/backoffice/ordenes/venta?edit=${o.id}`}
                      pdfHref={`/api/pdf/erp/orden?tipo=venta&id=${o.id}`}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
