import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/cn";
import { adminPage, surfaceCard } from "@/lib/ui-classes";
import { PageHeader, Stat, StatRow, EmptyState } from "@/components/ui/Patterns";
import { YieldInsights } from "./YieldInsights";

export const metadata = { title: productTitle("Analíticas") };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activeStatuses = ["accepted", "payment_pending", "confirmed"] as const;

  const [totalUnits, publishedUnits, rev30, rev90, topUnits] = await Promise.all([
    prisma.inventoryUnit.count(),
    prisma.inventoryUnit.count({ where: { status: "published" } }),
    prisma.reservation.aggregate({
      where: {
        status: { in: [...activeStatuses] },
        startsAt: { gte: thirtyDaysAgo },
      },
      _sum: { agreedAmount: true },
    }),
    prisma.reservation.aggregate({
      where: {
        status: { in: [...activeStatuses] },
        startsAt: { gte: ninetyDaysAgo },
      },
      _sum: { agreedAmount: true },
    }),
    prisma.inventoryUnit.findMany({
      where: { status: { in: ["published", "paused", "draft"] } },
      take: 40,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        basePriceAmount: true,
        reservations: {
          where: {
            status: { in: [...activeStatuses] },
            startsAt: { gte: ninetyDaysAgo },
          },
          select: { startsAt: true, endsAt: true, agreedAmount: true },
        },
      },
    }),
  ]);

  const last30Revenue = Number(rev30._sum.agreedAmount ?? 0);
  const last90Revenue = Number(rev90._sum.agreedAmount ?? 0);

  const unitMetrics = topUnits
    .map((u) => {
      const occupiedDays = u.reservations.reduce((acc, r) => {
        const start = Math.max(new Date(r.startsAt).getTime(), ninetyDaysAgo.getTime());
        const end = Math.min(new Date(r.endsAt).getTime(), now.getTime());
        if (end <= start) return acc;
        return acc + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }, 0);
      const fillRate = Math.min(100, Math.round((occupiedDays / 90) * 100));
      const revenue = u.reservations.reduce(
        (acc, r) => acc + Number(r.agreedAmount ?? u.basePriceAmount),
        0,
      );
      return {
        id: u.id,
        name: u.name,
        fillRate,
        revenue,
        totalReservations: u.reservations.length,
        status: u.status,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const avgFill =
    unitMetrics.length > 0
      ? Math.round(unitMetrics.reduce((a, u) => a + u.fillRate, 0) / unitMetrics.length)
      : 0;

  return (
    <div className={cn(adminPage, "gap-3")}>
      <PageHeader
        description="KPIs agregados; tabla limitada a las 40 unidades más recientes."
        eyebrow="Analíticas"
        title="Rendimiento"
      />

      <StatRow className="lg:grid-cols-4">
        <Stat label="Publicadas" value={`${publishedUnits}/${totalUnits}`} />
        <Stat label="Ingresos 30d" value={formatArs(last30Revenue)} />
        <Stat label="Ingresos 90d" value={formatArs(last90Revenue)} />
        <Stat label="Fill rate prom." value={`${avgFill}%`} />
      </StatRow>

      <div className={cn(surfaceCard(), "min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]")}>
        {unitMetrics.length === 0 ? (
          <EmptyState
            className="m-4 border-0 bg-transparent"
            description="Sin unidades para mostrar."
            title="Sin unidades"
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Unidad</th>
                <th className="px-4 py-2">Fill 90d</th>
                <th className="px-4 py-2">Ingresos 90d</th>
                <th className="px-4 py-2">Reservas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {unitMetrics.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 tabular-nums">{u.fillRate}%</td>
                  <td className="px-4 py-2.5 tabular-nums">{formatArs(u.revenue)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{u.totalReservations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <YieldInsights />
    </div>
  );
}
