import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";
import { PendientesTable } from "@/components/erp/erp-standard-tables";
import { loadPendingPayables } from "@/lib/erp-gestion";
import { money } from "@/lib/erp";

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
          <PendientesTable rows={rows} />
        )}
      </div>
    </div>
  );
}
