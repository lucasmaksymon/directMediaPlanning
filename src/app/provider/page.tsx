import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { reservationStatusLabel } from "@/lib/labels";

export const metadata = { title: productTitle("Panel Medio") };

export default async function ProviderDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "provider" && session.user.role !== "admin")) {
    redirect("/");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      inventoryUnits: {
        select: { id: true, name: true, status: true, basePriceAmount: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!profile) {
    return (
      <div className={cn(panelPage, pageScroll)}>
        <div className={cn(surfaceCard(), "p-8 text-center")}>
          <p className="text-muted-foreground">
            No encontramos tu perfil de proveedor. Contactá a soporte.
          </p>
        </div>
      </div>
    );
  }

  const [totalUnits, publishedUnits, pendingReservations, acceptedReservations] =
    await Promise.all([
      prisma.inventoryUnit.count({ where: { providerId: profile.id } }),
      prisma.inventoryUnit.count({ where: { providerId: profile.id, status: "published" } }),
      prisma.reservation.count({
        where: { inventoryUnit: { providerId: profile.id }, status: "pending_provider" },
      }),
      prisma.reservation.findMany({
        where: {
          inventoryUnit: { providerId: profile.id },
          status: { in: ["accepted", "confirmed"] },
        },
        select: { agreedAmount: true },
      }),
    ]);

  const totalRevenue = acceptedReservations.reduce(
    (acc, r) => acc + Number(r.agreedAmount ?? 0),
    0,
  );

  const recentReservations = await prisma.reservation.findMany({
    where: { inventoryUnit: { providerId: profile.id } },
    include: {
      inventoryUnit: { select: { name: true } },
      advertiser: { select: { email: true, advertiserProfile: { select: { legalName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Medio</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground">
          {profile.companyName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panel de gestión de tus espacios publicitarios
        </p>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Espacios totales", value: totalUnits, href: "/provider/inventario" },
          { label: "Publicados", value: publishedUnits, href: "/provider/inventario", accent: true },
          { label: "Solicitudes pendientes", value: pendingReservations, href: "/provider/reservas", urgent: pendingReservations > 0 },
          { label: "Ingresos confirmados", value: formatArs(totalRevenue), href: "/provider/analytics" },
        ].map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className={cn(
              surfaceCard(),
              "flex flex-col p-5 transition duration-200 hover:border-led/40",
              k.urgent && "border-signal/40",
            )}
          >
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                k.accent ? "text-led" : k.urgent ? "text-signal" : "text-foreground",
              )}
            >
              {k.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{k.label}</p>
          </Link>
        ))}
      </div>

      {/* CTA si no tiene espacios */}
      {totalUnits === 0 && (
        <div className={cn(surfaceCard(), "p-8 text-center")}>
          <p className="text-lg font-semibold text-foreground">¡Cargá tu primer espacio!</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Empezá a recibir solicitudes de anunciantes. Es rápido y sin costo adicional.
          </p>
          <Link
            href="/provider/inventario/nuevo"
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-7 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition hover:scale-[1.03]"
          >
            Agregar primer espacio →
          </Link>
        </div>
      )}

      {/* Accesos rápidos */}
      {totalUnits > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Link
            href="/provider/inventario/nuevo"
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-led/40"
          >
            + Agregar espacio
            <span className="text-led">→</span>
          </Link>
          <Link
            href="/provider/reservas"
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-led/40"
          >
            Ver solicitudes
            <span className="text-led">→</span>
          </Link>
          <Link
            href="/provider/analytics"
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-led/40"
          >
            Ver analytics
            <span className="text-led">→</span>
          </Link>
        </div>
      )}

      {/* Solicitudes recientes */}
      {recentReservations.length > 0 && (
        <div className={cn(surfaceCard(), "overflow-hidden")}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Solicitudes recientes
            </h2>
            <Link href="/provider/reservas" className="text-xs font-semibold text-led">
              Ver todas →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentReservations.map((r) => {
              const name =
                r.advertiser.advertiserProfile?.legalName ?? r.advertiser.email;
              return (
                <li key={r.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.inventoryUnit.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{name}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      r.status === "pending_provider"
                        ? "bg-signal/15 text-signal"
                        : r.status === "accepted" || r.status === "confirmed"
                        ? "bg-led/15 text-led"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {reservationStatusLabel[r.status] ?? r.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
