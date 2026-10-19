import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody, surfaceCard } from "@/lib/ui-classes";
import { PageHeader, Select } from "@/components/ui";
import { InformeTable } from "@/components/erp/erp-standard-tables";
import { buildMonthlyReport, type InformeExpenses } from "@/lib/erp-informe";
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
  const report = await buildMonthlyReport(month, year);
  const rows = report.rows;
  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Ganancia neta = venta − retenciones − compra − percepciones. Compra IVA y el resto de gastos se restan abajo. Las órdenes en rojo no están facturadas."
        eyebrow="Administración"
        title="Informe mensual"
      />
      <div className={cn(adminPageBody, "gap-4")}>
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
              compra: r.compra,
              retenciones: r.retenciones,
              venta: r.venta,
              percepciones: r.percepciones,
              gananciaNeta: r.gananciaNeta,
              porcentaje: r.porcentaje,
            }))}
          />
        )}
        <InformeExpensesBlock expenses={report.expenses} />
      </div>
    </div>
  );
}

function InformeExpensesBlock({ expenses }: { expenses: InformeExpenses }) {
  const lines = [
    ["Fijos", expenses.fixed],
    ["Banco", expenses.bank],
    ["IVA", expenses.vat],
    ["Compra IVA", expenses.vatPurchase],
    ["Gastos extra Ana", expenses.extra],
  ] as const;
  return (
    <section className={cn(surfaceCard(), "p-4")}>
      <h2 className="text-sm font-semibold">Gastos del mes</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Compra IVA es la comisión de las facturas de compra IVA del mes. El resultado resta todos estos gastos de la ganancia neta.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {lines.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{money(value)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Total gastos</dt>
          <dd className="tabular-nums font-medium">{money(expenses.total)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Resultado</dt>
          <dd className={cn("tabular-nums font-semibold", expenses.resultado < 0 && "text-[var(--error)]")}>
            {money(expenses.resultado)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
