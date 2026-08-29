import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { ErpGestionTable } from "@/components/erp/ErpGestionTable";
import { loadGestionLines } from "@/lib/erp-gestion";
import { ERP_COLLECT, ERP_MONTHS, ERP_SETTLE, money } from "@/lib/erp";

export const metadata = { title: productTitle("Gestión") };

export default async function ErpGestionPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string; q?: string; cobro?: string; pago?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.anio) || now.getFullYear();
  const month = params.mes ? Number(params.mes) : 0;
  const rows = await loadGestionLines({
    year,
    month: month || undefined,
    q: params.q?.trim() || undefined,
    sale: (params.cobro as "all" | "to_invoice" | "pending" | "collected") || "all",
    pay: (params.pago as "all" | "pending" | "paid") || "all",
  });

  const toInvoice = rows.filter((r) => !r.sale).length;
  const pendingSale = rows.filter((r) => r.sale && r.sale.collectStatus !== ERP_COLLECT.collected).length;
  const pendingPay = rows.filter(
    (r) =>
      (r.purchase && r.purchase.payStatus !== ERP_SETTLE.paid) ||
      (r.production && r.production.payStatus !== ERP_SETTLE.paid),
  ).length;
  const gananciaTotal = rows.reduce((sum, r) => sum + (r.ganancia ?? 0), 0);

  return (
    <div className={cn(adminPage, "gap-4 overflow-hidden")}>
      <PageHeader
        className="shrink-0"
        description="Misma planilla que el Excel GESTIÓN 2026: campaña, compra (IVA, IIBB, perc. IVA), producción, venta (retenciones) y ganancia bruta."
        eyebrow="Administración"
        title="Gestión"
      />
      <div className={cn(adminPageBody, "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-2")}>
        <form className="flex shrink-0 flex-wrap items-end gap-3" method="get">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Mes</span>
            <Select defaultValue={String(month)} name="mes">
              <option value="0">Todos</option>
              {ERP_MONTHS.slice(1).map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Año</span>
            <Input defaultValue={year} name="anio" type="number" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Cliente / orden / ítem</span>
            <Input defaultValue={params.q ?? ""} name="q" placeholder="MIMO, CPM, 12…" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Cobro</span>
            <Select defaultValue={params.cobro ?? "all"} name="cobro">
              <option value="all">Todos</option>
              <option value="to_invoice">A facturar</option>
              <option value="pending">Pendiente</option>
              <option value="collected">Cobrado</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Pago</span>
            <Select defaultValue={params.pago ?? "all"} name="pago">
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
            </Select>
          </label>
          <button className="text-sm font-semibold text-led" type="submit">
            Filtrar
          </button>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/backoffice/facturacion/pendientes">
            Pagos pendientes →
          </Link>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/backoffice/facturacion/cheques">
            Tesorería →
          </Link>
        </form>

        <p className="shrink-0 text-xs text-muted-foreground">
          {rows.length} filas · {toInvoice} a facturar · {pendingSale} cobro pendiente · {pendingPay} pago
          pendiente · ganancia bruta {money(gananciaTotal)}
        </p>

        {rows.length === 0 ? (
          <EmptyState
            description="No hay filas con estos filtros. Importá el Excel 2026 o cargá una O.P. de venta."
            title="Sin campañas"
          />
        ) : (
          <ErpGestionTable rows={rows} />
        )}
      </div>
    </div>
  );
}
