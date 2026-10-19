import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { TransferenciasTable } from "@/components/erp/erp-standard-tables";
import { ERP_PAY, erpPaymentOrderNumber } from "@/lib/erp";

export const metadata = { title: productTitle("Transferencias") };

export default async function ErpTransferenciasPage() {
  const payments = await prisma.erpTreasuryPayment.findMany({
    where: { paymentKind: ERP_PAY.transfer },
    orderBy: { createdAt: "desc" },
    include: {
      saleReceipt: { include: { client: { select: { name: true } } } },
      purchaseReceipt: { include: { vendor: { select: { name: true } } } },
      paymentOrder: { include: { vendor: { select: { name: true } } } },
    },
  });

  const received = payments
    .filter((p) => p.saleReceipt)
    .map((p) => ({
      id: p.id,
      number: p.number,
      party: p.saleReceipt?.client.name ?? "—",
      doc: p.saleReceipt ? `Recibo ${p.saleReceipt.number}` : "—",
      issuedAt: p.issuedAt ?? p.saleReceipt?.issuedAt ?? null,
      paidAt: p.paidAt,
      amount: Number(p.amount),
    }));

  const issued = payments
    .filter((p) => !p.saleReceiptId && (p.paymentOrder || p.purchaseReceipt))
    .map((p) => ({
      id: p.id,
      number: p.number,
      party: p.paymentOrder?.vendor.name ?? p.purchaseReceipt?.vendor.name ?? "—",
      doc: p.paymentOrder
        ? `OP ${erpPaymentOrderNumber(p.paymentOrder.id, p.paymentOrder.number)}`
        : p.purchaseReceipt
          ? `Recibo ${p.purchaseReceipt.number}`
          : "—",
      issuedAt: p.issuedAt ?? p.paymentOrder?.issuedAt ?? p.purchaseReceipt?.issuedAt ?? null,
      paidAt: p.paidAt,
      amount: Number(p.amount),
    }));

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Transferencias recibidas en recibos de venta y emitidas en órdenes de pago. Se cargan desde esos comprobantes."
        eyebrow="Facturación"
        title="Transferencias"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="received">
          <TabsList className="shrink-0 self-start">
            <TabsTrigger value="received">Recibidas ({received.length})</TabsTrigger>
            <TabsTrigger value="issued">Emitidas ({issued.length})</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-3 flex min-h-0 flex-1 flex-col" value="received">
            {received.length === 0 ? (
              <EmptyState description="Se generan al cargar un recibo con transferencia." title="Sin transferencias recibidas" />
            ) : (
              <TransferenciasTable kind="received" rows={received} />
            )}
          </TabsContent>
          <TabsContent className="mt-3 flex min-h-0 flex-1 flex-col" value="issued">
            {issued.length === 0 ? (
              <EmptyState description="Se generan al cargar una orden de pago con transferencia." title="Sin transferencias emitidas" />
            ) : (
              <TransferenciasTable kind="issued" rows={issued} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
