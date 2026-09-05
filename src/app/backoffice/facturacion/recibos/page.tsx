import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader } from "@/components/ui";
import { RecibosTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { createErpSaleReceipt, updateErpSaleReceipt } from "@/app/actions/erp-billing";
import {
  ERP_CHECK_MODE,
  ERP_CHECK_ORDER,
  ERP_CHECK_TYPE,
  ERP_PAY_SALE,
  ERP_PAY_SALE_STATUS,
  erpInputNumber,
  isoDate,
  isoDateOrEmpty,
  money,
  selectOptions,
} from "@/lib/erp";

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
      include: {
        client: { select: { name: true } },
        invoices: { include: { invoice: { select: { docType: true, pos: true, number: true } } } },
        payments: { orderBy: { createdAt: "asc" } },
      },
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
        description="Cobra facturas de venta. Los pagos (transferencia, cheque, efectivo y retenciones) quedan en tesorería."
        eyebrow="Facturación"
        title="Recibos de venta"
      />
      <div className={cn(adminPageBody, "gap-3")}>
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
            <Autocomplete
              defaultValue={[...selectedInvoices]}
              emptyLabel="Sin facturas"
              id="invoiceId"
              multiple
              name="invoiceId"
              options={invoices.map((f) => ({
                value: f.id,
                label: `${f.client.name} · ${f.docType} ${f.pos}-${f.number} · ${money(Number(f.amount) + Number(f.vat))}`,
              }))}
              placeholder="Buscar factura…"
            />
          </ErpField>
          <ErpLineList
            addLabel="Agregar pago"
            fields={[
              { name: "paymentKind", label: "Tipo pago", options: selectOptions(ERP_PAY_SALE) },
              { name: "number", label: "Número" },
              { name: "issuedAt", label: "Fecha emisión", type: "date" },
              { name: "paidAt", label: "Fecha de pago", type: "date" },
              { name: "checkOrder", label: "Orden cheque", options: selectOptions(ERP_CHECK_ORDER) },
              { name: "checkType", label: "Tipo cheque", options: selectOptions(ERP_CHECK_TYPE) },
              { name: "checkMode", label: "Modo cheque", options: selectOptions(ERP_CHECK_MODE) },
              { name: "amount", label: "Importe", type: "number" },
              { name: "estado", label: "Estado", options: selectOptions(ERP_PAY_SALE_STATUS) },
              { name: "attachmentUrl", label: "Recibo de pago", type: "file", wide: true },
            ]}
            prefix="py"
            rows={
              current?.payments.map((p) => ({
                id: p.id,
                values: {
                  paymentKind: String(p.paymentKind),
                  number: p.number ?? "",
                  issuedAt: isoDateOrEmpty(p.issuedAt),
                  paidAt: isoDateOrEmpty(p.paidAt),
                  checkOrder: String(p.checkOrder),
                  checkType: String(p.checkType),
                  checkMode: String(p.checkMode),
                  amount: erpInputNumber(p.amount),
                  estado: String(p.estado),
                  attachmentUrl: p.attachmentUrl ?? "",
                },
              })) ?? []
            }
            title="Pagos recibidos"
          />
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
              payKinds: r.payments.map((p) => p.paymentKind),
              invoices: r.invoices.map((link) => link.invoice),
            }))}
          />
        )}
      </div>
    </div>
  );
}
