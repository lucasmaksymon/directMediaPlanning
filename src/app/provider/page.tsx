import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { reservationStatusLabel } from "@/lib/labels";
import { PageHeader, Stat, StatRow, EmptyState, SectionHeader } from "@/components/ui/Patterns";
import { buttonVariants } from "@/lib/ui-variants";

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
        <EmptyState
          title="Perfil no encontrado"
          description="No encontramos tu perfil de proveedor. Contactá a soporte."
        />
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
      <PageHeader
        eyebrow="Medio"
        title={profile.companyName}
        description="Panel de gestión de tus espacios publicitarios"
      />

      <StatRow className="lg:grid-cols-4">
        <Link href="/provider/inventario" className="block">
          <Stat
            className="h-full transition hover:border-led/40"
            label="Espacios totales"
            value={totalUnits}
          />
        </Link>
        <Link href="/provider/inventario" className="block">
          <Stat
            accent
            className="h-full transition hover:border-led/40"
            label="Publicados"
            value={publishedUnits}
          />
        </Link>
        <Link href="/provider/reservas" className="block">
          <Stat
            className="h-full transition hover:border-led/40"
            label="Solicitudes pendientes"
            urgent={pendingReservations > 0}
            value={pendingReservations}
          />
        </Link>
        <Link href="/provider/analytics" className="block">
          <Stat
            className="h-full transition hover:border-led/40"
            label="Ingresos confirmados"
            value={formatArs(totalRevenue)}
          />
        </Link>
      </StatRow>

      {totalUnits === 0 && (
        <EmptyState
          title="Cargá tu primer espacio"
          description="Empezá a recibir solicitudes de anunciantes. Es rápido y sin costo adicional."
          actionLabel="Agregar primer espacio"
          actionHref="/provider/inventario/nuevo"
        />
      )}

      {totalUnits > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { href: "/provider/inventario/nuevo", label: "Agregar espacio" },
            { href: "/provider/reservas", label: "Ver solicitudes" },
            { href: "/provider/analytics", label: "Ver analytics" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={cn(buttonVariants({ variant: "outline", size: "md" }), "justify-between")}
            >
              {a.label} <span className="text-led">→</span>
            </Link>
          ))}
        </div>
      )}

      {recentReservations.length > 0 && (
        <div className={cn(surfaceCard(), "overflow-hidden")}>
          <div className="px-5 py-4">
            <SectionHeader
              title="Solicitudes recientes"
              actions={
                <Link href="/provider/reservas" className="text-xs font-medium text-led">
                  Ver todas →
                </Link>
              }
            />
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
