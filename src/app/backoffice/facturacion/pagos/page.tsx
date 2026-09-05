import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader } from "@/components/ui";
import { PagosTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpPurchasePayLines } from "@/components/erp/ErpPurchasePayLines";
import { createErpPaymentOrder, updateErpPaymentOrder } from "@/app/actions/erp-billing";
import { ErpPayMethodSelect } from "@/components/erp/ErpPayMethodSelect";
import {
  ERP_CHECK_DEFERRED,
  ERP_PAY,
  ERP_PAY_STATUS,
  erpInputNumber,
  erpPaymentOrderNumber,
  isoDate,
  isoDateOrEmpty,
  money,
} from "@/lib/erp";

export const metadata = { title: productTitle("Órdenes de pago") };

export default async function ErpOrdenesPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const chequeInclude = { saleReceipt: { select: { client: { select: { name: true } } } } } as const;
  const [orders, vendors, invoices, pendingCheques] = await Promise.all([
    prisma.erpPaymentOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        invoices: { include: { invoice: { select: { docType: true, pos: true, number: true } } } },
        treasury: { orderBy: { createdAt: "asc" } },
      },
      take: 200,
    }),
    prisma.erpVendor.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    prisma.erpPurchaseInvoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: { vendor: { select: { name: true } } },
      take: 100,
    }),
    prisma.erpTreasuryPayment.findMany({
      where: {
        paymentKind: ERP_PAY.cheque,
        saleReceiptId: { not: null },
        checkOrder: { not: ERP_CHECK_DEFERRED },
        estado: ERP_PAY_STATUS.pending,
      },
      include: chequeInclude,
      orderBy: { number: "asc" },
    }),
  ]);
  const current = orders.find((o) => o.id === edit);
  const extraChequeIds = [
    ...new Set(
      (current?.treasury ?? [])
        .map((p) => p.endorsedFromId)
        .filter((id): id is string => Boolean(id) && !pendingCheques.some((c) => c.id === id)),
    ),
  ];
  const extraCheques = extraChequeIds.length
    ? await prisma.erpTreasuryPayment.findMany({
        where: { id: { in: extraChequeIds } },
        include: chequeInclude,
      })
    : [];
  const cheques = [...extraCheques, ...pendingCheques];
  const selectedInvoices = new Set(current?.invoices.map((i) => i.invoiceId) ?? []);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Orden de pago al proveedor. Los pagos (transferencia, cheque, endoso y retenciones) quedan en tesorería."
        eyebrow="Facturación"
        title="Órdenes de pago"
      />
      <div className={cn(adminPageBody, "gap-3")}>
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
            <Input
              defaultValue={current ? Number(erpPaymentOrderNumber(current.id, current.number)) : undefined}
              id="number"
              name="number"
              required
              type="number"
            />
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
            <Autocomplete
              defaultValue={[...selectedInvoices]}
              emptyLabel="Sin facturas"
              id="invoiceId"
              multiple
              name="invoiceId"
              options={invoices.map((f) => ({
                value: f.id,
                label: `${f.vendor.name} · ${f.docType} ${f.pos}-${f.number} · ${money(Number(f.amount) + Number(f.vat))}`,
              }))}
              placeholder="Buscar factura…"
            />
          </ErpField>
          <ErpPurchasePayLines
            cheques={cheques.map((c) => ({
              id: c.id,
              number: c.number ?? "",
              label: `${c.number ?? "s/n"} · ${money(c.amount)} · ${c.saleReceipt?.client.name ?? "Cliente"}`,
              issuedAt: isoDateOrEmpty(c.issuedAt),
              paidAt: isoDateOrEmpty(c.paidAt),
              checkOrder: String(c.checkOrder),
              checkType: String(c.checkType),
              checkMode: String(c.checkMode),
              amount: erpInputNumber(c.amount),
            }))}
            rows={
              current?.treasury.map((p) => ({
                id: p.id,
                values: {
                  paymentKind: String(p.paymentKind),
                  number: p.number ?? "",
                  endorsedFromId: p.endorsedFromId ?? "",
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
          />
        </ErpForm>

        {orders.length === 0 ? (
          <EmptyState description="No hay órdenes de pago." title="Sin OP" />
        ) : (
          <PagosTable
            rows={orders.map((o) => ({
              id: o.id,
              number: erpPaymentOrderNumber(o.id, o.number),
              vendor: o.vendor.name,
              issuedAt: o.issuedAt,
              amount: Number(o.amount),
              notes: o.notes,
              payKinds: o.treasury.map((p) => p.paymentKind),
              invoices: o.invoices.map((link) => link.invoice),
            }))}
          />
        )}
      </div>
    </div>
  );
}
