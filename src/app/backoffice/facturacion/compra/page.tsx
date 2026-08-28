import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import {
  createErpPurchaseInvoice,
  deleteErpPurchaseInvoice,
  updateErpPurchaseInvoice,
} from "@/app/actions/erp-billing";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { displayDate, ERP_ORDER, ERP_SETTLE, erpInputNumber, isoDate, money } from "@/lib/erp";

export const metadata = { title: productTitle("Facturas de compra") };

export default async function ErpFacturasCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [invoices, vendors, purchaseOrders, productionOrders] = await Promise.all([
    prisma.erpPurchaseInvoice.findMany({
      where: { isVatPurchase: false },
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        orderLinks: { select: { purchaseOrderId: true, productionOrderId: true } },
      },
      take: 200,
    }),
    prisma.erpVendor.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    prisma.erpPurchaseOrder.findMany({
      where: { estado: ERP_ORDER.issued },
      include: { vendor: { select: { name: true } } },
    }),
    prisma.erpProductionOrder.findMany({
      where: { estado: ERP_ORDER.issued },
      include: { vendor: { select: { name: true } } },
    }),
  ]);
  const current = invoices.find((f) => f.id === edit);
  const currentOrderId = current?.orderLinks[0]?.purchaseOrderId ?? current?.orderLinks[0]?.productionOrderId ?? "";
  const openOrders = [
    ...purchaseOrders.map((o) => ({ id: o.id, label: `Compra ${o.number} · ${o.vendor.name}` })),
    ...productionOrders.map((o) => ({ id: o.id, label: `Producción ${o.number} · ${o.vendor.name}` })),
  ];
  if (current && currentOrderId && !openOrders.some((o) => o.id === currentOrderId)) {
    const link = current.orderLinks[0];
    if (link?.purchaseOrderId) {
      const extra = await prisma.erpPurchaseOrder.findUnique({
        where: { id: link.purchaseOrderId },
        include: { vendor: { select: { name: true } } },
      });
      if (extra) openOrders.unshift({ id: extra.id, label: `Compra ${extra.number} · ${extra.vendor.name}` });
    } else if (link?.productionOrderId) {
      const extra = await prisma.erpProductionOrder.findUnique({
        where: { id: link.productionOrderId },
        include: { vendor: { select: { name: true } } },
      });
      if (extra) openOrders.unshift({ id: extra.id, label: `Producción ${extra.number} · ${extra.vendor.name}` });
    }
  }

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Factura al proveedor. Incluye retenciones IVA / IIBB. Cierra la orden al cubrir el importe."
        eyebrow="Facturación"
        title="Facturas de compra"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpPurchaseInvoice : createErpPurchaseInvoice}
          cancelHref={current ? "/backoffice/facturacion/compra" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar factura de compra" : "Nueva factura de compra"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <input name="isVatPurchase" type="hidden" value="0" />
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
          <ErpField htmlFor="orderId" label="Orden emitida">
            <Select defaultValue={currentOrderId} id="orderId" name="orderId" required>
              <option value="">Seleccioná</option>
              {openOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </ErpField>
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
          <ErpField htmlFor="amount" label="Importe">
            <Input defaultValue={erpInputNumber(current?.amount)} id="amount" name="amount" />
          </ErpField>
          <ErpField htmlFor="vat" label="IVA">
            <Input defaultValue={erpInputNumber(current?.vat)} id="vat" name="vat" />
          </ErpField>
          <ErpField htmlFor="vatWithholding" label="Ret. IVA">
            <Input defaultValue={erpInputNumber(current?.vatWithholding)} id="vatWithholding" name="vatWithholding" />
          </ErpField>
          <ErpField htmlFor="iibbCaba" label="Ret. IIBB CABA">
            <Input defaultValue={erpInputNumber(current?.iibbCaba)} id="iibbCaba" name="iibbCaba" />
          </ErpField>
          <ErpField htmlFor="iibbBsAs" label="Ret. IIBB Bs.As.">
            <Input defaultValue={erpInputNumber(current?.iibbBsAs)} id="iibbBsAs" name="iibbBsAs" />
          </ErpField>
          <ErpField htmlFor="diegoFee" label="Com. Diego">
            <Input defaultValue={erpInputNumber(current?.diegoFee)} id="diegoFee" name="diegoFee" />
          </ErpField>
          <ErpField htmlFor="isCreditNote" label="Tipo de comprobante">
            <Select defaultValue={current?.isCreditNote ? "1" : "0"} id="isCreditNote" name="isCreditNote">
              <option value="0">Factura</option>
              <option value="1">Nota de crédito</option>
            </Select>
          </ErpField>
          <ErpField htmlFor="payStatus" label="Pago">
            <Select defaultValue={String(current?.payStatus ?? 0)} id="payStatus" name="payStatus">
              <option value={ERP_SETTLE.pending}>Pendiente</option>
              <option value={ERP_SETTLE.paid}>Pagado</option>
            </Select>
          </ErpField>
          <ErpField htmlFor="attachmentUrl" label="Adjunto (scan o URL)" wide>
            <ErpAttach defaultValue={current?.attachmentUrl} name="attachmentUrl" />
          </ErpField>
        </ErpForm>

        {invoices.length === 0 ? (
          <EmptyState description="No hay facturas de compra." title="Sin facturas" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Comprobante</TH>
                <TH>Proveedor</TH>
                <TH>Fecha</TH>
                <TH>Importe</TH>
                <TH>Retenciones</TH>
                <TH>Pago</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {invoices.map((f) => (
                <TR key={f.id}>
                  <TD className="font-medium">
                    {f.docType} {String(f.pos).padStart(4, "0")}-{String(f.number).padStart(8, "0")}
                  </TD>
                  <TD>{f.vendor.name}</TD>
                  <TD>{displayDate(f.issuedAt)}</TD>
                  <TD className="tabular-nums">{money(Number(f.amount) + Number(f.vat))}</TD>
                  <TD className="tabular-nums text-muted-foreground">
                    {money(Number(f.vatWithholding) + Number(f.iibbCaba) + Number(f.iibbBsAs))}
                  </TD>
                  <TD>{f.isCreditNote ? "NC · " : ""}{f.payStatus === 1 ? "Pagado" : "Pendiente"}</TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpPurchaseInvoice.bind(null, f.id)}
                      deleteConfirm="¿Borrar esta factura? Si la orden ya no cubre el importe, se reabre."
                      editHref={`/backoffice/facturacion/compra?edit=${f.id}`}
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
