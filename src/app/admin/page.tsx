import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { PageHeader, Stat, StatRow } from "@/components/ui/Patterns";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { buttonVariants } from "@/lib/ui-variants";
import { YieldInsights } from "@/app/admin/operaciones/analytics/YieldInsights";

export const metadata = { title: productTitle("Métricas") };

async function getStats() {
  const [
    totalUsers,
    totalProviders,
    totalAdvertisers,
    totalUnits,
    publishedUnits,
    totalReservations,
    pendingReservations,
    acceptedReservations,
    confirmedReservations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "provider" } }),
    prisma.user.count({ where: { role: "advertiser" } }),
    prisma.inventoryUnit.count(),
    prisma.inventoryUnit.count({ where: { status: "published" } }),
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: "pending_provider" } }),
    prisma.reservation.count({ where: { status: "accepted" } }),
    prisma.reservation.count({ where: { status: "confirmed" } }),
  ]);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const yieldStatuses = ["accepted", "payment_pending", "confirmed"] as const;

  const [totalARS, rev30, rev90, recentUnits] = await Promise.all([
    prisma.reservation.aggregate({
      where: { status: { in: ["accepted", "confirmed"] }, agreedAmount: { not: null } },
      _sum: { agreedAmount: true },
    }),
    prisma.reservation.aggregate({
      where: { status: { in: [...yieldStatuses] }, startsAt: { gte: thirtyDaysAgo } },
      _sum: { agreedAmount: true },
    }),
    prisma.reservation.aggregate({
      where: { status: { in: [...yieldStatuses] }, startsAt: { gte: ninetyDaysAgo } },
      _sum: { agreedAmount: true },
    }),
    prisma.inventoryUnit.findMany({
      where: { status: { in: ["published", "paused", "draft"] } },
      take: 40,
      orderBy: { updatedAt: "desc" },
      select: {
        reservations: {
          where: { status: { in: [...yieldStatuses] }, startsAt: { gte: ninetyDaysAgo } },
          select: { startsAt: true, endsAt: true },
        },
      },
    }),
  ]);

  const fillRates = recentUnits.map((u) => {
    const occupiedDays = u.reservations.reduce((acc, r) => {
      const start = Math.max(new Date(r.startsAt).getTime(), ninetyDaysAgo.getTime());
      const end = Math.min(new Date(r.endsAt).getTime(), now.getTime());
      if (end <= start) return acc;
      return acc + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.min(100, Math.round((occupiedDays / 90) * 100));
  });
  const avgFill =
    fillRates.length > 0
      ? Math.round(fillRates.reduce((a, n) => a + n, 0) / fillRates.length)
      : 0;

  return {
    totalUsers,
    totalProviders,
    totalAdvertisers,
    totalUnits,
    publishedUnits,
    totalReservations,
    pendingReservations,
    acceptedReservations,
    confirmedReservations,
    totalARS: Number(totalARS._sum.agreedAmount ?? 0),
    last30Revenue: Number(rev30._sum.agreedAmount ?? 0),
    last90Revenue: Number(rev90._sum.agreedAmount ?? 0),
    avgFill,
  };
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const s = await getStats();

  return (
    <div className={adminPage}>
      <PageHeader
        description="Resumen operativo de la plataforma."
        eyebrow="Operaciones"
        title="Métricas globales"
      />

      <div className={cn(adminPageBody, "flex flex-col gap-5")}>
        <Card className="flex flex-wrap items-baseline gap-3 px-5 py-4">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-led">
            {formatArs(s.totalARS)}
          </p>
          <p className="nm-secondary">Total en reservas aceptadas + confirmadas</p>
        </Card>

        <StatRow>
          <Stat label="Usuarios" value={s.totalUsers} />
          <Stat label="Medios" value={s.totalProviders} />
          <Stat label="Anunciantes" value={s.totalAdvertisers} />
          <Stat accent label="Unidades" value={`${s.publishedUnits}/${s.totalUnits}`} />
          <Stat
            label="Pendientes"
            urgent={s.pendingReservations > 0}
            value={s.pendingReservations}
          />
        </StatRow>

        <StatRow className="sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Total reservas" value={s.totalReservations} />
          <Stat accent label="Aceptadas" value={s.acceptedReservations} />
          <Stat accent label="Confirmadas" value={s.confirmedReservations} />
          <Stat label="Fill rate 90d" value={`${s.avgFill}%`} />
        </StatRow>

        <StatRow className="sm:grid-cols-2">
          <Stat label="Ingresos 30d" value={formatArs(s.last30Revenue)} />
          <Stat label="Ingresos 90d" value={formatArs(s.last90Revenue)} />
        </StatRow>

        <YieldInsights />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { href: "/admin/usuarios", label: "Usuarios" },
            { href: "/admin/reservas", label: "Reservas" },
            { href: "/admin/operaciones/inventory", label: "Inventario" },
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
      </div>
    </div>
  );
}
