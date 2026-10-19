import type { ReactNode } from "react";
import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, surfaceCard } from "@/lib/ui-classes";
import { Badge, PageHeader, Stat, StatRow } from "@/components/ui";
import { displayDate, ERP_MONTHS, money } from "@/lib/erp";
import { loadBackofficeDashboard, type DashboardDue } from "@/lib/erp-dashboard";

export const metadata = { title: productTitle("Administración") };

function ActionCard({
  href,
  label,
  count,
  amount,
  hint,
  urgent,
}: {
  href: string;
  label: string;
  count: number;
  amount: number;
  hint?: string;
  urgent?: boolean;
}) {
  return (
    <Link
      className={cn(
        surfaceCard(),
        "flex flex-col p-4 transition hover:border-led/40",
        urgent && "border-[var(--error)]/40",
      )}
      href={href}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", urgent && "text-[var(--error)]")}>
        {count}
      </p>
      <p className="text-sm tabular-nums text-foreground">{money(amount)}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <span className="mt-3 text-xs font-semibold text-led">Abrir →</span>
    </Link>
  );
}

function Panel({
  title,
  href,
  linkLabel,
  children,
  empty,
  emptyLabel = "Nada pendiente.",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <section className={cn(surfaceCard(), "flex shrink-0 flex-col p-4")}>
      <div className="mb-3 flex items-end justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {href ? (
          <Link className="text-xs font-semibold text-led hover:underline" href={href}>
            {linkLabel ?? "Ver todo"}
          </Link>
        ) : null}
      </div>
      {empty ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : children}
    </section>
  );
}

function DueRow({ row }: { row: DashboardDue }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">
          <Link className="hover:underline" href={row.href}>
            {row.doc}
          </Link>
          {row.overdue ? (
            <Badge className="ml-1.5 align-middle" variant="warning">
              Vencido
            </Badge>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {row.kind === "cobro" ? "Cobro" : row.vatPurchase ? "Pago IVA" : "Pago"} · {row.party} · O.P. {row.order}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("tabular-nums", row.overdue && "font-semibold text-[var(--error)]")}>
          {money(row.amount)}
        </p>
        <p className="text-[11px] text-muted-foreground">{displayDate(row.dueAt)}</p>
      </div>
    </li>
  );
}

/** "+12% vs septiembre"; sin dato si el mes anterior no tuvo movimiento. */
function versus(current: number, previous: number, label: string) {
  if (previous === 0) return current === 0 ? undefined : `Sin datos de ${label}`;
  const pct = ((current - previous) * 100) / Math.abs(previous);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% vs ${label}`;
}

export default async function BackofficeHomePage() {
  const data = await loadBackofficeDashboard();
  const monthLabel = `${ERP_MONTHS[data.month]} ${data.year}`;
  const prevLabel = ERP_MONTHS[data.previous.month].toLowerCase();
  const margin = data.margen == null ? null : `${data.margen.toFixed(1)}% sobre venta`;
  const gananciaVs = versus(data.ganancia, data.previous.ganancia, prevLabel);

  return (
    <div className={cn(adminPage, "gap-5 overflow-y-auto")}>
      <PageHeader
        className="shrink-0"
        actions={
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link className="text-led hover:underline" href="/backoffice/gestion">
              Gestión
            </Link>
            <Link className="text-foreground hover:underline" href="/backoffice/informe">
              Informe
            </Link>
            <Link className="text-foreground hover:underline" href="/backoffice/ordenes/venta">
              Nueva O.P.
            </Link>
          </div>
        }
        description={`Qué hay que facturar, cobrar y pagar. Órdenes de ${monthLabel}.`}
        eyebrow="Administración"
        title="Inicio"
      />

      {data.failed ? (
        <p className={cn(surfaceCard(), "shrink-0 border-[var(--error)]/40 p-3 text-sm text-[var(--error)]")}>
          No se pudieron cargar los datos del inicio. Recargá la página; si sigue, revisá la conexión a la base.
        </p>
      ) : null}

      <StatRow className="shrink-0 lg:grid-cols-3">
        <Stat
          hint={versus(data.venta, data.previous.venta, prevLabel) ?? "Órdenes del mes · neto"}
          label={`Venta neta · ${monthLabel}`}
          value={money(data.venta)}
        />
        <Stat hint="Órdenes de compra y producción · neto" label="Compra neta" value={money(data.compra)} />
        <Stat
          accent
          hint={[margin, gananciaVs].filter(Boolean).join(" · ") || undefined}
          label="Ganancia neta de órdenes"
          urgent={data.ganancia < 0}
          value={money(data.ganancia)}
        />
      </StatRow>

      <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          amount={data.toInvoice.amount}
          count={data.toInvoice.count}
          href="/backoffice/facturacion/a-facturar"
          hint="Falta facturar, con IVA y sin efectivo"
          label="A facturar"
          urgent={data.toInvoice.count > 0}
        />
        <ActionCard
          amount={data.receivables.amount}
          count={data.receivables.count}
          href="/backoffice/facturacion/por-cobrar"
          hint={
            data.receivables.overdueCount
              ? `${data.receivables.overdueCount} vencidas · ${money(data.receivables.overdueAmount)}`
              : "Facturas de venta pendientes"
          }
          label="Por cobrar"
          urgent={data.receivables.overdueCount > 0}
        />
        <ActionCard
          amount={data.payables.amount}
          count={data.payables.count}
          href="/backoffice/facturacion/pendientes"
          hint={
            data.payables.overdueCount
              ? `${data.payables.overdueCount} vencidas · ${money(data.payables.overdueAmount)}`
              : "Facturas de compra pendientes"
          }
          label="Por pagar"
          urgent={data.payables.overdueCount > 0}
        />
        <ActionCard
          amount={data.cheques.amount}
          count={data.cheques.count}
          href="/backoffice/facturacion/cheques"
          hint={
            data.cheques.count
              ? `${data.cheques.receivedCount} recibidos · ${data.cheques.issuedCount} emitidos`
              : "Sin cheques pendientes"
          }
          label="Cheques pendientes"
        />
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <Panel
          empty={data.agenda.length === 0}
          href={
            data.receivables.overdueCount >= data.payables.overdueCount
              ? "/backoffice/facturacion/por-cobrar?vencido=1"
              : "/backoffice/facturacion/pendientes?vencido=1"
          }
          linkLabel="Vencidos"
          title="Próximos vencimientos"
        >
          <ul className="divide-y divide-divide">
            {data.agenda.map((row) => (
              <DueRow key={`${row.kind}-${row.id}`} row={row} />
            ))}
          </ul>
        </Panel>

        <Panel
          empty={data.toInvoice.rows.length === 0}
          href="/backoffice/facturacion/a-facturar"
          title="Órdenes sin facturar"
        >
          <ul className="divide-y divide-divide">
            {data.toInvoice.rows.map((o) => (
              <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm" key={o.id}>
                <div className="min-w-0">
                  <Link className="font-medium hover:underline" href={`/backoffice/ordenes/venta?edit=${o.id}`}>
                    {o.number}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.client} · {ERP_MONTHS[o.month]} {o.year}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums">{money(o.amount)}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          empty={data.campaigns.length === 0}
          emptyLabel="No hay campañas al aire hoy."
          href="/backoffice/gestion"
          title="Al aire ahora"
        >
          <ul className="divide-y divide-divide">
            {data.campaigns.map((c) => (
              <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm" key={c.id}>
                <div className="min-w-0">
                  <Link className="font-medium hover:underline" href={`/backoffice/ordenes/venta?edit=${c.orderId}`}>
                    {c.element}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.client} · {c.location ?? "—"} · O.P. {c.order}
                  </p>
                </div>
                <p className="shrink-0 text-[11px] text-muted-foreground">
                  hasta {displayDate(c.endsAt)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          empty={data.topClients.length === 0}
          emptyLabel="Todavía no hay órdenes este mes."
          href={`/backoffice/informe?mes=${data.month}&anio=${data.year}`}
          linkLabel="Informe"
          title={`Clientes · ${monthLabel}`}
        >
          <ul className="divide-y divide-divide">
            {data.topClients.map((c) => (
              <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm" key={c.name}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Venta {money(c.venta)}</p>
                </div>
                <p className="shrink-0 tabular-nums font-medium">{money(c.ganancia)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {data.recentOrders.length > 0 ? (
        <Panel href="/backoffice/ordenes/venta" title="Últimas órdenes">
          <ul className="divide-y divide-divide">
            {data.recentOrders.map((o) => (
              <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm" key={o.id}>
                <Link className="min-w-0 truncate hover:underline" href={`/backoffice/ordenes/venta?edit=${o.id}`}>
                  <span className="font-medium">{o.number}</span>
                  <span className="text-muted-foreground"> · {o.client}</span>
                </Link>
                <span className="shrink-0 tabular-nums">{money(o.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
