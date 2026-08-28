import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import {
  createErpPurchaseInvoice,
  deleteErpPurchaseInvoice,
  updateErpPurchaseInvoice,
} from "@/app/actions/erp-billing";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { displayDate, erpInputNumber, isoDate, money } from "@/lib/erp";

export const metadata = { title: productTitle("Facturas compra IVA") };

export default async function ErpFacturasIvaPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const [invoices, vendors, purchaseOrders, productionOrders] = await Promise.all([
    prisma.erpPurchaseInvoice.findMany({
      where: { isVatPurchase: true },
      orderBy: { issuedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        orderLinks: { select: { purchaseOrderId: true, productionOrderId: true } },
      },
      take: 200,
    }),
    prisma.erpVendor.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    prisma.erpPurchaseOrder.findMany({
      include: { vendor: { select: { name: true } }, saleOrder: { select: { number: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.erpProductionOrder.findMany({
      include: { vendor: { select: { name: true } }, saleOrder: { select: { number: true } } },
      orderBy: { issuedAt: "desc" },
    }),
  ]);
  const current = invoices.find((f) => f.id === edit);
  const currentOrderId = current?.orderLinks[0]?.purchaseOrderId ?? current?.orderLinks[0]?.productionOrderId ?? "";
  const openOrders = [
    ...purchaseOrders.map((o) => ({
      id: o.id,
      label: `Compra ${o.number} · ${o.saleOrder.number} · ${o.vendor.name}`,
    })),
    ...productionOrders.map((o) => ({
      id: o.id,
      label: `Producción ${o.number} · ${o.saleOrder.number} · ${o.vendor.name}`,
    })),
  ];

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Factura de compra IVA (compraIva=1) con comisión. Entra aparte en el informe mensual."
        eyebrow="Facturación"
        title="Facturas de compra IVA"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpPurchaseInvoice : createErpPurchaseInvoice}
          cancelHref={current ? "/backoffice/facturacion/iva" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar factura IVA" : "Nueva factura IVA"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <input name="isVatPurchase" type="hidden" value="1" />
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
          <ErpField htmlFor="orderId" label="Orden de compra o producción">
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
          <ErpField htmlFor="commission" label="Comisión">
            <Input defaultValue={erpInputNumber(current?.commission)} id="commission" name="commission" />
          </ErpField>
        </ErpForm>

        {invoices.length === 0 ? (
          <EmptyState description="No hay facturas de compra IVA." title="Sin facturas IVA" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Comprobante</TH>
                <TH>Proveedor</TH>
                <TH>Fecha</TH>
                <TH>Total</TH>
                <TH>Comisión</TH>
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
                  <TD className="tabular-nums">{money(f.commission)}</TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpPurchaseInvoice.bind(null, f.id)}
                      deleteConfirm="¿Borrar esta factura IVA?"
                      editHref={`/backoffice/facturacion/iva?edit=${f.id}`}
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
