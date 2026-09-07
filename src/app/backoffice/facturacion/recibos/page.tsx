import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { RecibosTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { createErpSaleReceipt, updateErpSaleReceipt } from "@/app/actions/erp-billing";
import { ErpSaleReceiptFormFields } from "@/components/erp/ocr/ErpSaleReceiptFormFields";
import { ErpOcrImportClient } from "@/components/erp/ocr/ErpOcrImportClient";
import { erpInputNumber, isoDate, isoDateOrEmpty, money } from "@/lib/erp";

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
          <ErpSaleReceiptFormFields
            allowOcr={!current}
            clients={clients.map((c) => ({ value: c.id, label: c.name }))}
            current={
              current
                ? {
                    id: current.id,
                    clientId: current.clientId,
                    number: current.number,
                    issuedAt: isoDate(current.issuedAt),
                    amount: erpInputNumber(current.amount),
                    balance: erpInputNumber(current.balance),
                    attachmentUrl: current.attachmentUrl,
                    invoiceIds: [...selectedInvoices],
                    payments: current.payments.map((p) => ({
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
                    })),
                  }
                : null
            }
            invoices={invoices.map((f) => ({
              value: f.id,
              label: `${f.client.name} · ${f.docType} ${f.pos}-${f.number} · ${money(Number(f.amount) + Number(f.vat))}`,
            }))}
            now={isoDate(now)}
          />
        </ErpForm>
        <ErpOcrImportClient
          clients={clients.map((c) => ({ value: c.id, label: c.name }))}
          invoices={invoices.map((f) => ({
            value: f.id,
            label: `${f.client.name} · ${f.docType} ${f.pos}-${f.number} · ${money(Number(f.amount) + Number(f.vat))}`,
          }))}
          kind="sale_receipt"
        />

        {receipts.length === 0 ? (
          <div className="contents">
            <div className="flex justify-end gap-2" data-erp-page-toolbar />
            <EmptyState description="No hay recibos." title="Sin recibos" />
          </div>
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
