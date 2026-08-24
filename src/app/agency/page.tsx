import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { productTitle } from "@/lib/brand";
import Link from "next/link";

export const metadata = { title: productTitle("Panel Agencia") };

export default async function AgencyPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "agency" && session.user.role !== "admin")) {
    redirect("/");
  }

  const agencyProfile = await prisma.agencyProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, companyName: true, commissionPct: true },
  });

  if (!agencyProfile) {
    return (
      <div className={cn(panelPage, pageScroll)}>
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">
          Panel Agencia
        </h1>
        <div className={cn(surfaceCard(), "p-8 text-center")}>
          <p className="text-muted-foreground">
            Tu cuenta fue registrada como agencia, pero no encontramos el perfil. Contactá a soporte.
          </p>
        </div>
      </div>
    );
  }

  const clients = await prisma.agencyClient.findMany({
    where: { agencyId: agencyProfile.id },
    include: {
      advertiser: {
        include: {
          advertiserProfile: { select: { legalName: true } },
          reservations: {
            include: { inventoryUnit: { select: { name: true, locationLabel: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      },
    },
  });

  // KPIs de comisiones
  const agencyReservations = await prisma.reservation.findMany({
    where: { agencyId: agencyProfile.id },
    select: { status: true, agreedAmount: true, commissionAmount: true },
  });

  const confirmedAgencyReservations = agencyReservations.filter((r) =>
    ["accepted", "confirmed"].includes(r.status),
  );
  const totalCommissions = confirmedAgencyReservations.reduce(
    (acc, r) => acc + Number(r.commissionAmount ?? 0),
    0,
  );
  const totalManaged = confirmedAgencyReservations.reduce(
    (acc, r) => acc + Number(r.agreedAmount ?? 0),
    0,
  );
  const totalCampaigns = clients.reduce((acc, c) => acc + c.advertiser.reservations.length, 0);

  return (
    <div className={cn(panelPage, pageScroll, "gap-8")}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Agencia</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground">
          {agencyProfile.companyName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comisión estándar: {Number(agencyProfile.commissionPct)}%
        </p>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Clientes", value: clients.length, href: "/agency/clientes" },
          { label: "Campañas totales", value: totalCampaigns, href: "/agency/clientes" },
          { label: "Inversión gestionada", value: formatArs(totalManaged), href: "/agency/clientes", accent: false },
          { label: "Comisiones totales", value: formatArs(totalCommissions), href: "/agency/clientes", accent: true },
        ].map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className={cn(
              surfaceCard(),
              "flex flex-col p-5 transition duration-200 hover:border-led/40",
            )}
          >
            <p className={cn("text-2xl font-bold tabular-nums", k.accent ? "text-led" : "text-foreground")}>
              {k.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{k.label}</p>
          </Link>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/agency/clientes"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-led/40"
        >
          Gestionar clientes
          <span className="text-led">→</span>
        </Link>
        <Link
          href="/explorar"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-led/40"
        >
          Explorar catálogo
          <span className="text-led">→</span>
        </Link>
        <Link
          href="/agency/comparar"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-led/40"
        >
          Comparar espacios
          <span className="text-led">→</span>
        </Link>
      </div>

      {/* Comisiones recientes */}
      {confirmedAgencyReservations.length > 0 && (
        <div className={cn(surfaceCard(), "p-5 sm:p-6")}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Comisiones acumuladas
          </h2>
          <div className="flex flex-wrap gap-6 mt-3">
            <div>
              <p className="text-3xl font-bold text-led tabular-nums">{formatArs(totalCommissions)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Total comisiones cobradas</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums text-foreground">{confirmedAgencyReservations.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Reservas vía agencia</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {totalManaged > 0 ? `${Math.round((totalCommissions / totalManaged) * 100)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Comisión efectiva promedio</p>
            </div>
          </div>
        </div>
      )}

      {/* Clientes */}
      {clients.length === 0 ? (
        <div className={cn(surfaceCard(), "py-12 text-center")}>
          <p className="text-muted-foreground">Aún no tenés clientes.</p>
          <Link href="/agency/clientes" className="mt-3 inline-flex text-sm text-led font-semibold underline">
            Agregar cliente →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vista consolidada de clientes
          </h2>
          {clients.map((c) => {
            const name = c.advertiser.advertiserProfile?.legalName ?? c.advertiser.email;
            return (
              <div key={c.id} className={cn(surfaceCard(), "p-5 sm:p-6")}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{c.advertiser.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.advertiser.reservations.length} solicitudes
                  </span>
                </div>
                {c.advertiser.reservations.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {c.advertiser.reservations.slice(0, 3).map((r) => (
                      <li key={r.id} className="py-2 text-sm">
                        <span className="font-medium text-foreground">{r.inventoryUnit.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          · {reservationStatusLabel[r.status] ?? r.status}
                        </span>
                        {r.agreedAmount && (
                          <span className="ml-2 text-muted-foreground">
                            · {formatArs(r.agreedAmount)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin solicitudes aún.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
