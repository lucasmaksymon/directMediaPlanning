import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { ChequesTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { createErpIssuedCheque, updateErpCheque } from "@/app/actions/erp-billing";
import {
  ERP_PAY,
  ERP_PAY_PURCHASE_STATUS,
  ERP_PAY_SALE_STATUS,
  ERP_PAY_STATUS,
  erpInputNumber,
  isoDate,
  selectOptions,
} from "@/lib/erp";

export const metadata = { title: productTitle("Cheques") };

export default async function ErpChequesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; tab?: string }>;
}) {
  const { edit, tab } = await searchParams;
  const now = new Date();
  const payments = await prisma.erpTreasuryPayment.findMany({
    where: { paymentKind: ERP_PAY.cheque },
    orderBy: { createdAt: "desc" },
    include: {
      saleReceipt: { include: { client: { select: { name: true } } } },
      purchaseReceipt: { include: { vendor: { select: { name: true } } } },
      paymentOrder: { include: { vendor: { select: { name: true } } } },
    },
  });
  const current = payments.find((p) => p.id === edit);
  const received = payments.filter((p) => p.saleReceiptId);
  const issued = payments.filter((p) => !p.saleReceiptId);
  const endorsedIds = new Set(
    payments.map((p) => p.endorsedFromId).filter((id): id is string => Boolean(id)),
  );
  const editingReceived = Boolean(current?.saleReceiptId);
  const activeTab = current ? (editingReceived ? "received" : "issued") : tab === "issued" ? "issued" : "received";

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="E-cheq y cheques físicos. Recibidos cuelgan del recibo de venta; emitidos de la OP al proveedor."
        eyebrow="Facturación"
        title="Cheques"
      />
      <div className={cn(adminPageBody, "gap-3")}>
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
              defaultValue={String(current?.estado ?? ERP_PAY_STATUS.done)}
              id="estado"
              name="estado"
              options={selectOptions(editingReceived ? ERP_PAY_SALE_STATUS : ERP_PAY_PURCHASE_STATUS)}
              placeholder="Estado…"
            />
          </ErpField>
          <ErpField htmlFor="attachmentUrl" label="Recibo de pago" wide>
            <ErpAttach defaultValue={current?.attachmentUrl} name="attachmentUrl" />
          </ErpField>
        </ErpForm>

        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue={activeTab} key={activeTab}>
          <TabsList className="shrink-0 self-start">
            <TabsTrigger value="received">Recibidos ({received.length})</TabsTrigger>
            <TabsTrigger value="issued">Emitidos ({issued.length})</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-3 flex min-h-0 flex-1 flex-col" value="received">
            {received.length === 0 ? (
              <EmptyState description="Se generan al cargar un recibo con cheque." title="Sin cheques recibidos" />
            ) : (
              <ChequesTable
                storageKey="erp.table.cheques-recibidos.v3"
                rows={received.map((p) => ({
                  id: p.id,
                  number: p.number,
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
          </TabsContent>
          <TabsContent className="mt-3 flex min-h-0 flex-1 flex-col" value="issued">
            {issued.length === 0 ? (
              <EmptyState description="Cargá un cheque emitido arriba." title="Sin cheques emitidos" />
            ) : (
              <ChequesTable
                storageKey="erp.table.cheques-emitidos.v3"
                rows={issued.map((p) => ({
                  id: p.id,
                  number: p.number,
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
