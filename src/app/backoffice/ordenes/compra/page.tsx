import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { createErpPurchaseOrder, deleteErpPurchaseOrder, updateErpPurchaseOrder } from "@/app/actions/erp-orders";
import { displayDate, ERP_VENDOR, erpInputNumber, erpOrderBadge, erpOrderLabel, isoDate, money } from "@/lib/erp";
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
        </ErpForm>

        {orders.length === 0 ? (
          <EmptyState description="No hay órdenes de compra." title="Sin O.P. compra" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Número</TH>
                <TH>Venta</TH>
                <TH>Proveedor</TH>
                <TH>Fecha</TH>
                <TH>Importe</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD className="font-medium">{o.number}</TD>
                  <TD>
                    {o.saleOrder.number}
                    <span className="block text-xs text-muted-foreground">{o.saleOrder.client.name}</span>
                  </TD>
                  <TD>{o.vendor.name}</TD>
                  <TD>{displayDate(o.issuedAt)}</TD>
                  <TD className="tabular-nums">{money(o.amount)}</TD>
                  <TD>
                    <Badge variant={erpOrderBadge(o.estado)}>{erpOrderLabel(o.estado)}</Badge>
                  </TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpPurchaseOrder.bind(null, o.id)}
                      deleteConfirm={`¿Borrar la O.P. ${o.number}?`}
                      editHref={`/backoffice/ordenes/compra?edit=${o.id}`}
                      pdfHref={`/api/pdf/erp/orden?tipo=compra&id=${o.id}`}
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
