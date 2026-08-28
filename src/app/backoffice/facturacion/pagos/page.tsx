import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { createErpPaymentOrder, deleteErpPaymentOrder, updateErpPaymentOrder } from "@/app/actions/erp-billing";
import { ErpPayMethodSelect } from "@/components/erp/ErpPayMethodSelect";
import { displayDate, erpInputNumber, isoDate, money } from "@/lib/erp";

export const metadata = { title: productTitle("Órdenes de pago") };

export default async function ErpOrdenesPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [orders, vendors, invoices] = await Promise.all([
    prisma.erpPaymentOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: { vendor: { select: { name: true } }, invoices: true },
      take: 200,
    }),
    prisma.erpVendor.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    prisma.erpPurchaseInvoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: { vendor: { select: { name: true } } },
      take: 100,
    }),
  ]);
  const current = orders.find((o) => o.id === edit);
  const selectedInvoices = new Set(current?.invoices.map((i) => i.invoiceId) ?? []);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden de pago al proveedor, vinculada a facturas de compra."
        eyebrow="Facturación"
        title="Órdenes de pago"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpPaymentOrder : createErpPaymentOrder}
          cancelHref={current ? "/backoffice/facturacion/pagos" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar orden de pago" : "Nueva orden de pago"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
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
            <Input defaultValue={current?.number} id="number" name="number" required type="number" />
          </ErpField>
          <ErpField htmlFor="issuedAt" label="Fecha">
            <Input defaultValue={isoDate(current?.issuedAt ?? now)} id="issuedAt" name="issuedAt" type="date" />
          </ErpField>
          <ErpField htmlFor="amount" label="Importe">
            <Input defaultValue={erpInputNumber(current?.amount)} id="amount" name="amount" />
          </ErpField>
          <ErpField htmlFor="balance" label="Saldo">
            <Input defaultValue={erpInputNumber(current?.balance)} id="balance" name="balance" />
          </ErpField>
          <ErpField htmlFor="notes" label="Medio de pago" wide>
            <ErpPayMethodSelect defaultValue={current?.notes} />
          </ErpField>
          <ErpField htmlFor="invoiceId" label="Facturas de compra" wide>
            <select
              className="nm-select min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              defaultValue={[...selectedInvoices]}
              id="invoiceId"
              multiple
              name="invoiceId"
            >
              {invoices.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.vendor.name} · {f.docType} {f.pos}-{f.number} · {money(Number(f.amount) + Number(f.vat))}
                </option>
              ))}
            </select>
          </ErpField>
        </ErpForm>

        {orders.length === 0 ? (
          <EmptyState description="No hay órdenes de pago." title="Sin OP" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nº</TH>
                <TH>Proveedor</TH>
                <TH>Fecha</TH>
                <TH>Importe</TH>
                <TH>Medio</TH>
                <TH>Facturas</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD className="font-medium">{o.number}</TD>
                  <TD>{o.vendor.name}</TD>
                  <TD>{displayDate(o.issuedAt)}</TD>
                  <TD className="tabular-nums">{money(o.amount)}</TD>
                  <TD className="max-w-[14rem] truncate text-xs text-muted-foreground" title={o.notes ?? ""}>
                    {o.notes ?? "—"}
                  </TD>
                  <TD className="tabular-nums text-muted-foreground">{o.invoices.length}</TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpPaymentOrder.bind(null, o.id)}
                      deleteConfirm="¿Borrar esta orden de pago?"
                      editHref={`/backoffice/facturacion/pagos?edit=${o.id}`}
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
