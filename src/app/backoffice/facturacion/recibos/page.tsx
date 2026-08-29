import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { RecibosTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { createErpSaleReceipt, updateErpSaleReceipt } from "@/app/actions/erp-billing";
import { erpInputNumber, isoDate, money } from "@/lib/erp";

export const metadata = { title: productTitle("Recibos de venta") };

export default async function ErpRecibosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [receipts, clients, invoices] = await Promise.all([
    prisma.erpSaleReceipt.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } }, invoices: true, payments: true },
      take: 200,
    }),
    prisma.erpClient.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    prisma.erpSaleInvoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } } },
      take: 300,
    }),
  ]);
  const current = receipts.find((r) => r.id === edit);
  const selectedInvoices = new Set(current?.invoices.map((i) => i.invoiceId) ?? []);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Cobra facturas de venta. Si cargás un cheque, se registra en tesorería (tipoPago=1)."
        eyebrow="Facturación"
        title="Recibos de venta"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpSaleReceipt : createErpSaleReceipt}
          cancelHref={current ? "/backoffice/facturacion/recibos" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar recibo" : "Nuevo recibo"}
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
          <ErpField htmlFor="invoiceId" label="Facturas" wide>
            <select
              className="nm-select min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              defaultValue={[...selectedInvoices]}
              id="invoiceId"
              multiple
              name="invoiceId"
            >
              {invoices.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.client.name} · {f.docType} {f.pos}-{f.number} · {money(Number(f.amount) + Number(f.vat))}
                </option>
              ))}
            </select>
          </ErpField>
          {!current ? (
            <>
              <ErpField htmlFor="chequeNumber" label="Cheque (opcional)">
                <Input id="chequeNumber" name="chequeNumber" />
              </ErpField>
              <ErpField htmlFor="chequeAmount" label="Importe cheque">
                <Input defaultValue="0" id="chequeAmount" name="chequeAmount" />
              </ErpField>
            </>
          ) : null}
        </ErpForm>

        {receipts.length === 0 ? (
          <EmptyState description="No hay recibos." title="Sin recibos" />
        ) : (
          <RecibosTable
            rows={receipts.map((r) => ({
              id: r.id,
              number: r.number,
              client: r.client.name,
              issuedAt: r.issuedAt,
              amount: Number(r.amount),
              balance: Number(r.balance),
              invoices: r.invoices.length,
            }))}
          />
        )}
      </div>
    </div>
  );
}
