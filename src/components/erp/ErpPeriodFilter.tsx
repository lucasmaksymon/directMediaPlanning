import Link from "next/link";
import { Input, Select } from "@/components/ui";
import { ERP_MONTHS } from "@/lib/erp";
import type { ErpPeriodFilter as ErpPeriod } from "@/lib/erp-list";

export function parseErpPeriod(params: { mes?: string; anio?: string }): ErpPeriod {
  const month = Number(params.mes) || undefined;
  const year = Number(params.anio) || undefined;
  return { month, year };
}

/** Filtro GET por período de servicio de la O.P. de venta (mes/año), no por fecha de emisión. */
export function ErpPeriodFilter({ basePath, period }: { basePath: string; period: ErpPeriod }) {
  const active = Boolean(period.month || period.year);
  return (
    <form action={basePath} className="flex shrink-0 flex-wrap items-end gap-3" method="get">
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Período · mes</span>
        <Select defaultValue={String(period.month ?? 0)} name="mes">
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
        <Input className="w-28" defaultValue={period.year ?? ""} name="anio" placeholder="Todos" type="number" />
      </label>
      <button className="text-sm font-semibold text-led" type="submit">
        Filtrar
      </button>
      {active ? (
        <Link className="text-sm text-muted-foreground hover:text-foreground" href={basePath}>
          Limpiar
        </Link>
      ) : null}
    </form>
  );
}
