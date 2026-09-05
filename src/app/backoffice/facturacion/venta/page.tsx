import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { FacturasVentaTable } from "@/components/erp/erp-standard-tables";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { createErpSaleInvoice, updateErpSaleInvoice } from "@/app/actions/erp-billing";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { ErpSaleInvoiceLinks } from "@/components/erp/ErpSaleInvoiceLinks";
import { ERP_COLLECT, ERP_ORDER, erpInputNumber, erpReceiptRef, isoDate, money } from "@/lib/erp";

export const metadata = { title: productTitle("Facturas de venta") };

export default async function ErpFacturasVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [invoices, openOrders, receipts] = await Promise.all([
    prisma.erpSaleInvoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } }, saleOrder: { select: { number: true, client: { select: { name: true } } } } },
      take: 200,
    }),
    prisma.erpSaleOrder.findMany({
      where: { estado: ERP_ORDER.issued },
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true, legalName: true } } },
    }),
    prisma.erpSaleReceipt.findMany({
      orderBy: { issuedAt: "desc" },
      include: { client: { select: { name: true } } },
      take: 300,
    }),
  ]);
  const current = invoices.find((f) => f.id === edit);
  const orderOptions = [...openOrders];
  if (current && !orderOptions.some((o) => o.id === current.saleOrderId)) {
    const extra = await prisma.erpSaleOrder.findUnique({
      where: { id: current.saleOrderId },
      include: { client: { select: { name: true, legalName: true } } },
    });
    if (extra) orderOptions.unshift(extra);
  }

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Si la suma de importe + IVA cubre la orden, la O.P. pasa a estado Facturada. Si se borra y ya no cubre, se reabre."
        eyebrow="Facturación"
        title="Facturas de venta"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpSaleInvoice : createErpSaleInvoice}
          cancelHref={current ? "/backoffice/facturacion/venta" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar factura de venta" : "Nueva factura de venta"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpSaleInvoiceLinks
            defaultAmount={current ? Number(current.amount) : undefined}
            defaultLegalName={current?.legalName}
            defaultOrderId={current?.saleOrderId}
            defaultReceiptRef={current?.receiptRef}
            defaultVat={current ? Number(current.vat) : undefined}
            orders={orderOptions.map((o) => ({
              id: o.id,
              label: `${o.number} · ${o.client.name} · ${money(o.amount)}`,
              clientId: o.clientId,
              legalName: o.client.legalName?.trim() || o.client.name,
              net: Number(o.net),
              vat: Number(o.vat),
            }))}
            receipts={receipts.map((r) => ({
              clientId: r.clientId,
              ref: erpReceiptRef(r.number),
              label: `${erpReceiptRef(r.number)} · ${r.client.name} · ${money(r.amount)}`,
            }))}
          />
          <ErpField htmlFor="issuedAt" label="Fecha">
            <Input defaultValue={isoDate(current?.issuedAt ?? now)} id="issuedAt" name="issuedAt" type="date" />
          </ErpField>
          <ErpField htmlFor="docType" label="Tipo">
            <ErpDocTypeSelect defaultValue={current?.docType} />
          </ErpField>
          <ErpField htmlFor="pos" label="Punto">
            <Input defaultValue={current?.pos ?? 1} id="pos" name="pos" type="number" />
          </ErpField>
          <ErpField htmlFor="number" label="Número">
            <Input defaultValue={current?.number} id="number" name="number" required type="number" />
          </ErpField>
          <ErpField htmlFor="detail" label="Detalle">
            <Input defaultValue={current?.detail ?? ""} id="detail" name="detail" />
          </ErpField>
          <ErpField htmlFor="collectStatus" label="Cobro">
            <Select defaultValue={String(current?.collectStatus ?? 0)} id="collectStatus" name="collectStatus">
              <option value={ERP_COLLECT.pending}>Pendiente</option>
              <option value={ERP_COLLECT.collected}>Cobrado</option>
            </Select>
          </ErpField>
          <ErpField htmlFor="collected" label="Cobrado">
            <Input defaultValue={erpInputNumber(current?.collected)} id="collected" name="collected" />
          </ErpField>
          <ErpField htmlFor="echeq" label="E-cheq">
            <Input defaultValue={erpInputNumber(current?.echeq)} id="echeq" name="echeq" />
          </ErpField>
          <ErpField htmlFor="bank" label="Banco / transfer">
            <Input defaultValue={erpInputNumber(current?.bank)} id="bank" name="bank" />
          </ErpField>
          <ErpField htmlFor="attachmentUrl" label="Adjunto (scan o URL)" wide>
            <ErpAttach defaultValue={current?.attachmentUrl} name="attachmentUrl" />
          </ErpField>
          <ErpField htmlFor="retGan" label="Ret. gan.">
            <Input defaultValue={erpInputNumber(current?.retGan)} id="retGan" name="retGan" />
          </ErpField>
          <ErpField htmlFor="retVat" label="Ret. IVA">
            <Input defaultValue={erpInputNumber(current?.retVat)} id="retVat" name="retVat" />
          </ErpField>
          <ErpField htmlFor="retSuss" label="Ret. SUSS">
            <Input defaultValue={erpInputNumber(current?.retSuss)} id="retSuss" name="retSuss" />
          </ErpField>
          <ErpField htmlFor="retIibb" label="Ret. IIBB">
            <Input defaultValue={erpInputNumber(current?.retIibb)} id="retIibb" name="retIibb" />
          </ErpField>
        </ErpForm>

        {invoices.length === 0 ? (
          <EmptyState description="No hay facturas de venta." title="Sin facturas" />
        ) : (
          <FacturasVentaTable
            rows={invoices.map((f) => ({
              id: f.id,
              docType: f.docType,
              pos: f.pos,
              number: f.number,
              client: f.client.name,
              order: f.saleOrder.number,
              issuedAt: f.issuedAt,
              dueAt: f.dueAt,
              total: Number(f.amount) + Number(f.vat),
              collectStatus: f.collectStatus,
            }))}
          />
        )}
      </div>
    </div>
  );
}
