import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { PageHeader, Select } from "@/components/ui";
import { InformeTable } from "@/components/erp/erp-standard-tables";
import { buildMonthlyReport } from "@/lib/erp-informe";
import { ERP_MONTHS } from "@/lib/erp";

export const metadata = { title: productTitle("Informe mensual") };

export default async function ErpInformePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.mes) || now.getMonth() + 1;
  const year = Number(params.anio) || now.getFullYear();
  const rows = await buildMonthlyReport(month, year);
  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Misma fórmula que el legado: ganancia bruta = venta neta de retenciones − compra − compra IVA. Las órdenes en rojo no están facturadas."
        eyebrow="Administración"
        title="Informe mensual"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-4 pb-8")}>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Mes</span>
            <Select defaultValue={String(month)} name="mes">
              {ERP_MONTHS.slice(1).map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Año</span>
            <Select defaultValue={String(year)} name="anio">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </label>
          <button className="text-sm font-semibold text-led" type="submit">
            Ver informe
          </button>
          <a
            className="text-sm font-semibold text-foreground hover:underline"
            href={`/api/pdf/erp/informe?mes=${month}&anio=${year}`}
            rel="noreferrer"
            target="_blank"
          >
            PDF
          </a>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/backoffice/gastos">
            Cargar gastos →
          </Link>
        </form>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay O.P. de venta en {ERP_MONTHS[month]} {year}.
          </p>
        ) : (
          <InformeTable
            rows={rows.map((r, i) => ({
              key: `${r.kind}-${r.client}-${r.order}-${i}`,
              kind: r.kind,
              client: r.client,
              order: r.order,
              uninvoiced: r.uninvoiced,
              compraTotal: r.compraTotal,
              ventaTotal: r.ventaTotal,
              totalCompraIva: r.totalCompraIva,
              comision: r.comision,
              gananciaBruta: r.gananciaBruta,
              porcentaje: r.porcentaje,
            }))}
          />
        )}
      </div>
    </div>
  );
}
