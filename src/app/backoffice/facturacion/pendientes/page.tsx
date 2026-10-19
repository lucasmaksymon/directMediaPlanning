import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader, Stat, StatRow } from "@/components/ui";
import { PendientesTable } from "@/components/erp/erp-standard-tables";
import { ErpFilterPills } from "@/components/erp/ErpFilterPills";
import { loadPendingPayables } from "@/lib/erp-gestion";
import { money } from "@/lib/erp";

export const metadata = { title: productTitle("Pagos pendientes") };

const BASE = "/backoffice/facturacion/pendientes";

export default async function ErpPagosPendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ vencido?: string }>;
}) {
  const { vencido } = await searchParams;
  const onlyOverdue = vencido === "1";
  const all = await loadPendingPayables();
  const overdue = all.filter((r) => r.overdue);
  const total = all.reduce((acc, r) => acc + r.amount, 0);
  const overdueTotal = overdue.reduce((acc, r) => acc + r.amount, 0);
  const rows = onlyOverdue ? overdue : all;

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Facturas de compra sin pagar. El vencimiento es fecha + plazo del proveedor (60 días en el Excel)."
        eyebrow="Facturación"
        title="Pagos pendientes"
      />
      <div className={cn(adminPageBody, "gap-4")}>
        <StatRow className="shrink-0">
          <Stat hint={`${all.length} comprobantes`} label="Total a pagar" value={money(total)} />
          <Stat
            hint={`${overdue.length} comprobantes`}
            label="Vencido a la fecha"
            urgent={overdueTotal > 0}
            value={money(overdueTotal)}
          />
        </StatRow>
        <ErpFilterPills
          items={[
            { href: BASE, label: `Todas (${all.length})`, active: !onlyOverdue },
            { href: `${BASE}?vencido=1`, label: `Vencidas (${overdue.length})`, active: onlyOverdue },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            description={onlyOverdue ? "No hay facturas de compra vencidas." : "No hay facturas de compra pendientes."}
            title="Al día"
          />
        ) : (
          <PendientesTable rows={rows} />
        )}
      </div>
    </div>
  );
}
