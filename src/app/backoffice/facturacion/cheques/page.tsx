import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader } from "@/components/ui";
import { ChequesTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { createErpIssuedCheque, updateErpCheque } from "@/app/actions/erp-billing";
import { ERP_PAY, ERP_PAY_SALE_STATUS, erpInputNumber, isoDate, selectOptions } from "@/lib/erp";

export const metadata = { title: productTitle("Cheques") };

export default async function ErpChequesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const payments = await prisma.erpTreasuryPayment.findMany({
    where: { paymentKind: { in: [ERP_PAY.cheque, ERP_PAY.transfer] } },
    orderBy: { createdAt: "desc" },
    include: {
      saleReceipt: { include: { client: { select: { name: true } } } },
      purchaseReceipt: { include: { vendor: { select: { name: true } } } },
      paymentOrder: { include: { vendor: { select: { name: true } } } },
    },
    take: 500,
  });
  const current = payments.find((p) => p.id === edit);
  const received = payments.filter((p) => p.saleReceiptId);
  const issued = payments.filter((p) => !p.saleReceiptId);
  const endorsedIds = new Set(
    payments.map((p) => p.endorsedFromId).filter((id): id is string => Boolean(id)),
  );

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="E-cheq y transferencias. Recibidos cuelgan del recibo de venta; emitidos de la OP al proveedor."
        eyebrow="Facturación"
        title="Cheques"
      />
      <div className={cn(adminPageBody, "gap-8 overflow-y-auto")}>
        <ErpForm
          action={current ? updateErpCheque : createErpIssuedCheque}
          cancelHref={current ? "/backoffice/facturacion/cheques" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar cheque" : "Cheque emitido"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="number" label="Número">
            <Input defaultValue={current?.number ?? ""} id="number" name="number" required />
          </ErpField>
          <ErpField htmlFor="amount" label="Importe">
            <Input defaultValue={erpInputNumber(current?.amount)} id="amount" name="amount" />
          </ErpField>
          <ErpField htmlFor="issuedAt" label="Emisión">
            <Input defaultValue={isoDate(current?.issuedAt ?? now)} id="issuedAt" name="issuedAt" type="date" />
          </ErpField>
          <ErpField htmlFor="paidAt" label="Pago">
            <Input defaultValue={isoDate(current?.paidAt ?? now)} id="paidAt" name="paidAt" type="date" />
          </ErpField>
          <ErpField htmlFor="estado" label="Estado">
            <Autocomplete
              defaultValue={String(current?.estado ?? 0)}
              id="estado"
              name="estado"
              options={selectOptions(ERP_PAY_SALE_STATUS)}
              placeholder="Estado…"
            />
          </ErpField>
          <ErpField htmlFor="attachmentUrl" label="Recibo de pago" wide>
            <ErpAttach defaultValue={current?.attachmentUrl} name="attachmentUrl" />
          </ErpField>
        </ErpForm>

        <section className="space-y-3">
          <h2 className="nm-section-title">Recibidos</h2>
          {received.length === 0 ? (
            <EmptyState description="Se generan al cargar un recibo con cheque." title="Sin cheques recibidos" />
          ) : (
            <ChequesTable
              storageKey="erp.table.cheques-recibidos.v2"
              rows={received.map((p) => ({
                id: p.id,
                number: p.number,
                paymentKind: p.paymentKind,
                party: p.saleReceipt?.client.name ?? "—",
                issuedAt: p.issuedAt,
                paidAt: p.paidAt,
                amount: Number(p.amount),
                estado: p.estado,
                checkOrder: p.checkOrder,
                endorsed: endorsedIds.has(p.id),
                kind: "received" as const,
              }))}
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="nm-section-title">Emitidos</h2>
          {issued.length === 0 ? (
            <EmptyState description="Cargá un cheque emitido arriba." title="Sin cheques emitidos" />
          ) : (
            <ChequesTable
              storageKey="erp.table.cheques-emitidos.v2"
              rows={issued.map((p) => ({
                id: p.id,
                number: p.number,
                paymentKind: p.paymentKind,
                party: p.purchaseReceipt?.vendor.name ?? p.paymentOrder?.vendor.name ?? "—",
                issuedAt: p.issuedAt,
                paidAt: p.paidAt,
                amount: Number(p.amount),
                estado: p.estado,
                checkOrder: p.checkOrder,
                kind: "issued" as const,
              }))}
            />
          )}
        </section>
      </div>
    </div>
  );
}
