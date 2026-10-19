import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader, Stat, StatRow } from "@/components/ui";
import { AFacturarTable } from "@/components/erp/erp-standard-tables";
import { loadOrdersToInvoice } from "@/lib/erp-gestion";
import { money } from "@/lib/erp";

export const metadata = { title: productTitle("A facturar") };

export default async function ErpAFacturarPage() {
  const rows = await loadOrdersToInvoice();
  const net = rows.reduce((acc, r) => acc + r.net, 0);
  const remaining = rows.reduce((acc, r) => acc + r.remaining, 0);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="O.P. de venta emitidas que todavía no se facturaron por completo."
        eyebrow="Facturación"
        title="A facturar"
      />
      <div className={cn(adminPageBody, "gap-4")}>
        <StatRow className="shrink-0">
          <Stat hint={`${rows.length} órdenes`} label="Neto de las órdenes" value={money(net)} />
          <Stat hint="Total con IVA, sin efectivo" label="Falta facturar" value={money(remaining)} />
        </StatRow>

        {rows.length === 0 ? (
          <EmptyState description="Todas las órdenes están facturadas." title="Al día" />
        ) : (
          <AFacturarTable rows={rows} />
        )}
      </div>
    </div>
  );
}
