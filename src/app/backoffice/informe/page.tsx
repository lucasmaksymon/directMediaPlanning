import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { buildMonthlyReport } from "@/lib/erp-informe";
import { ERP_MONTHS, money } from "@/lib/erp";

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

        <Table>
          <THead>
            <TR>
              <TH>Cliente</TH>
              <TH>Orden</TH>
              <TH>Compra</TH>
              <TH>Venta</TH>
              <TH>Compra IVA</TH>
              <TH>Comisión</TH>
              <TH>Ganancia</TH>
              <TH>%</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TR>
                <TD className="text-muted-foreground" colSpan={8}>
                  No hay O.P. de venta en {ERP_MONTHS[month]} {year}.
                </TD>
              </TR>
            ) : (
              rows.map((r, i) => {
                const strong = r.kind !== "order";
                return (
                  <TR key={`${r.kind}-${r.client}-${r.order}-${i}`}>
                    <TD className={cn(strong && "font-semibold")}>{r.client}</TD>
                    <TD className={cn(r.uninvoiced && "font-semibold text-[var(--error)]")}>{r.order}</TD>
                    <TD className="tabular-nums">{money(r.compraTotal)}</TD>
                    <TD className="tabular-nums">{r.kind === "expenses" ? "—" : money(r.ventaTotal)}</TD>
                    <TD className="tabular-nums">{r.kind === "expenses" ? "—" : money(r.totalCompraIva)}</TD>
                    <TD className="tabular-nums">{r.kind === "expenses" ? "—" : money(r.comision)}</TD>
                    <TD className="tabular-nums font-medium">{money(r.gananciaBruta)}</TD>
                    <TD className="tabular-nums">
                      {r.porcentaje == null ? "—" : `${r.porcentaje.toFixed(2)}%`}
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
