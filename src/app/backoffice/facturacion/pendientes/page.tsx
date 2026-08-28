import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, PageHeader, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { loadPendingPayables } from "@/lib/erp-gestion";
import { displayDate, ERP_SETTLE, money } from "@/lib/erp";
import { setErpPurchasePayStatus } from "@/app/actions/erp-billing";

export const metadata = { title: productTitle("Pagos pendientes") };

export default async function ErpPagosPendientesPage() {
  const rows = await loadPendingPayables();
  const overdue = rows.filter((r) => r.overdue && r.amount > 0);
  const total = rows.reduce((acc, r) => acc + r.amount, 0);
  const overdueTotal = overdue.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Facturas de compra sin pagar. El vencimiento es fecha + plazo del proveedor (60 días en el Excel)."
        eyebrow="Facturación"
        title="Pagos pendientes"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-4 pb-8")}>
        <p className="text-sm text-muted-foreground">
          {rows.length} comprobantes · {money(total)} a pagar
          {overdue.length > 0 ? ` · ${overdue.length} vencidos (${money(overdueTotal)})` : ""}
        </p>
        <Link className="text-sm font-semibold text-led" href="/backoffice/gestion">
          ← Volver a Gestión
        </Link>

        {rows.length === 0 ? (
          <EmptyState description="No hay facturas de compra pendientes." title="Al día" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vence</TH>
                <TH>Factura</TH>
                <TH>Proveedor</TH>
                <TH>Orden</TH>
                <TH>Importe</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className={r.overdue ? "font-semibold text-[var(--error)]" : ""}>
                    {displayDate(r.dueAt)}
                    <span className="block text-xs text-muted-foreground">FC {displayDate(r.issuedAt)}</span>
                  </TD>
                  <TD className="font-medium">
                    {r.doc}
                    {r.overdue ? (
                      <Badge className="ml-2" variant="warning">
                        Vencido
                      </Badge>
                    ) : null}
                  </TD>
                  <TD>{r.vendor}</TD>
                  <TD>{r.order}</TD>
                  <TD className="tabular-nums">{money(r.amount)}</TD>
                  <TD>
                    <ErpRowActions
                      confirmAction={setErpPurchasePayStatus.bind(null, r.id, ERP_SETTLE.paid)}
                      confirmLabel="Pagada"
                      confirmPrompt="¿Marcar esta factura como pagada?"
                      editHref={`/backoffice/facturacion/compra?edit=${r.id}`}
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
