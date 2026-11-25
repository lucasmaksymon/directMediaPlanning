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

type Tab = "todas" | "vencidas" | "iva";

const EMPTY: Record<Tab, string> = {
  todas: "No hay facturas de compra pendientes.",
  vencidas: "No hay facturas de compra vencidas.",
  iva: "No hay facturas de compra IVA pendientes.",
};

function sum(rows: { amount: number }[]) {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

export default async function ErpPagosPendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ vencido?: string; iva?: string }>;
}) {
  const { vencido, iva } = await searchParams;
  const tab: Tab = iva === "1" ? "iva" : vencido === "1" ? "vencidas" : "todas";
  const pending = await loadPendingPayables();
  // Las de compra IVA pueden no pagarse nunca: van aparte y no suman al total ni a lo vencido.
  const all = pending.filter((r) => !r.isVatPurchase);
  const vat = pending.filter((r) => r.isVatPurchase);
  const overdue = all.filter((r) => r.overdue);
  const rows = tab === "iva" ? vat : tab === "vencidas" ? overdue : all;
  const overdueTotal = sum(overdue);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Facturas de compra sin pagar. El vencimiento es fecha + plazo del proveedor (60 días en el Excel). Las de compra IVA van en su propia pestaña y no suman a los totales."
        eyebrow="Facturación"
        title="Pagos pendientes"
      />
      <div className={cn(adminPageBody, "gap-4")}>
        {tab === "iva" ? (
          <StatRow className="shrink-0">
            <Stat hint={`${vat.length} comprobantes`} label="Compra IVA pendiente" value={money(sum(vat))} />
          </StatRow>
        ) : (
          <StatRow className="shrink-0">
            <Stat hint={`${all.length} comprobantes`} label="Total a pagar" value={money(sum(all))} />
            <Stat
              hint={`${overdue.length} comprobantes`}
              label="Vencido a la fecha"
              urgent={overdueTotal > 0}
              value={money(overdueTotal)}
            />
          </StatRow>
        )}
        <ErpFilterPills
          items={[
            { href: BASE, label: `Todas (${all.length})`, active: tab === "todas" },
            { href: `${BASE}?vencido=1`, label: `Vencidas (${overdue.length})`, active: tab === "vencidas" },
            { href: `${BASE}?iva=1`, label: `Compra IVA (${vat.length})`, active: tab === "iva" },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState description={EMPTY[tab]} title="Al día" />
        ) : (
          <PendientesTable rows={rows} />
        )}
      </div>
    </div>
  );
}
