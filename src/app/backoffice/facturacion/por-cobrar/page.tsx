import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, PageHeader, Stat, StatRow } from "@/components/ui";
import { PorCobrarTable } from "@/components/erp/erp-standard-tables";
import { ErpFilterPills } from "@/components/erp/ErpFilterPills";
import { loadPendingReceivables } from "@/lib/erp-gestion";
import { money } from "@/lib/erp";

export const metadata = { title: productTitle("Por cobrar") };

const BASE = "/backoffice/facturacion/por-cobrar";

export default async function ErpPorCobrarPage({
  searchParams,
}: {
  searchParams: Promise<{ vencido?: string }>;
}) {
  const { vencido } = await searchParams;
  const onlyOverdue = vencido === "1";
  const all = await loadPendingReceivables();
  const overdue = all.filter((r) => r.overdue);
  const total = all.reduce((acc, r) => acc + r.amount, 0);
  const overdueTotal = overdue.reduce((acc, r) => acc + r.amount, 0);
  const rows = onlyOverdue ? overdue : all;

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Facturas de venta pendientes de cobro. Importe = neto + IVA − retenciones."
        eyebrow="Facturación"
        title="Por cobrar"
      />
      <div className={cn(adminPageBody, "gap-4")}>
        <StatRow className="shrink-0">
          <Stat hint={`${all.length} facturas`} label="Total a cobrar" value={money(total)} />
          <Stat
            hint={`${overdue.length} facturas`}
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
            description={onlyOverdue ? "No hay facturas de venta vencidas." : "No hay facturas de venta pendientes."}
            title="Al día"
          />
        ) : (
          <PorCobrarTable rows={rows} />
        )}
      </div>
    </div>
  );
}
