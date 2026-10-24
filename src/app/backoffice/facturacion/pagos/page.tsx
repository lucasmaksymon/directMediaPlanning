import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader } from "@/components/ui";
import { ErpVendorInvoicePicker } from "@/components/erp/ErpVendorInvoicePicker";
import { PagosTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpPurchasePayLines } from "@/components/erp/ErpPurchasePayLines";
import { createErpPaymentOrder, updateErpPaymentOrder } from "@/app/actions/erp-billing";
import { ErpPayMethodSelect } from "@/components/erp/ErpPayMethodSelect";
import {
  ERP_PAY,
  ERP_PAY_STATUS,
  ERP_SETTLE,
  erpInputNumber,
  erpInvoiceRef,
  erpPaymentOrderNumber,
  erpPurchaseInvoiceTotal,
  isoDate,
  isoDateOrEmpty,
  money,
} from "@/lib/erp";
import { listActiveVendors } from "@/lib/erp-list";

export const metadata = { title: productTitle("Órdenes de pago") };

export default async function ErpOrdenesPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const chequeInclude = { saleReceipt: { select: { client: { select: { name: true } } } } } as const;
  const [orders, vendors, invoices, pendingCheques, endorsedCheques] = await Promise.all([
    prisma.erpPaymentOrder.findMany({
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        invoices: {
          include: {
            invoice: {
              select: {
                docType: true,
                pos: true,
                number: true,
                amount: true,
                vat: true,
                vatWithholding: true,
                iibbCaba: true,
                iibbBsAs: true,
                internalTax: true,
                nonTaxable: true,
              },
            },
          },
        },
        treasury: { orderBy: { createdAt: "asc" } },
      },
    }),
    listActiveVendors(),
    prisma.erpPurchaseInvoice.findMany({
      where: {
        OR: [
          { payStatus: ERP_SETTLE.pending },
          ...(edit ? [{ paymentLinks: { some: { paymentOrderId: edit } } }] : []),
        ],
      },
      orderBy: { issuedAt: "desc" },
      include: { vendor: { select: { name: true } } },
    }),
    prisma.erpTreasuryPayment.findMany({
      where: {
        paymentKind: ERP_PAY.cheque,
        saleReceiptId: { not: null },
        estado: ERP_PAY_STATUS.pending,
      },
      include: chequeInclude,
      orderBy: { number: "asc" },
    }),
    edit
      ? prisma.erpTreasuryPayment.findMany({
          where: { endorsements: { some: { paymentOrderId: edit } } },
          include: chequeInclude,
        })
      : Promise.resolve([]),
  ]);
  const current = orders.find((o) => o.id === edit);
  const pendingIds = new Set(pendingCheques.map((c) => c.id));
  const cheques = [...endorsedCheques.filter((c) => !pendingIds.has(c.id)), ...pendingCheques];
  const selectedInvoices = new Set(current?.invoices.map((i) => i.invoiceId) ?? []);
  const nextNumber = orders.reduce((max, o) => Math.max(max, Number(erpPaymentOrderNumber(o.id, o.number)) || 0), 0) + 1;

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
          key={current?.id ?? `new-${nextNumber}`}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar orden de pago" : "Nueva orden de pago"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpVendorInvoicePicker
            defaultInvoiceIds={[...selectedInvoices]}
            defaultVendorId={current?.vendorId}
            invoices={invoices.map((f) => ({
              value: f.id,
              vendorId: f.vendorId,
              label: `${f.vendor.name} · ${erpInvoiceRef(f.docType, f.pos, f.number)} · ${money(erpPurchaseInvoiceTotal(f))}`,
            }))}
            vendors={vendors.map((v) => ({ value: v.id, label: v.name }))}
          >
            <ErpField htmlFor="number" label="Número">
              <Input
                defaultValue={current ? Number(erpPaymentOrderNumber(current.id, current.number)) : nextNumber}
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
              <Input
                defaultValue={erpInputNumber(
                  current?.invoices.length
                    ? current.invoices.reduce((sum, link) => sum + erpPurchaseInvoiceTotal(link.invoice), 0)
                    : current?.amount,
                )}
                id="amount"
                name="amount"
              />
            </ErpField>
            <ErpField htmlFor="balance" label="Saldo">
              <Input defaultValue={erpInputNumber(current?.balance)} id="balance" name="balance" />
            </ErpField>
            <ErpField htmlFor="notes" label="Medio de pago" wide>
              <ErpPayMethodSelect defaultValue={current?.notes} />
            </ErpField>
          </ErpVendorInvoicePicker>
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
              amount: o.invoices.length
                ? o.invoices.reduce((sum, link) => sum + erpPurchaseInvoiceTotal(link.invoice), 0)
                : Number(o.amount),
              notes: o.notes,
              payKinds: o.treasury.map((p) => p.paymentKind),
              invoices: o.invoices.map(({ invoice }) => ({
                docType: invoice.docType,
                pos: invoice.pos,
                number: invoice.number,
              })),
            }))}
          />
        )}
      </div>
    </div>
  );
}
