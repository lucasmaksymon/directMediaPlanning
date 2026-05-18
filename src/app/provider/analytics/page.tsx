import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";
import { YieldInsights } from "./YieldInsights";

export const metadata = { title: "Analíticas · Direct Planning" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) redirect("/provider");

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const units = await prisma.inventoryUnit.findMany({
    where: { providerId: profile.id },
    include: {
      reservations: {
        where: { status: { in: ["accepted", "payment_pending", "confirmed"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const totalUnits = units.length;
  const publishedUnits = units.filter((u) => u.status === "published").length;

  const allReservations = units.flatMap((u) => u.reservations);
  const last90Revenue = allReservations
    .filter((r) => new Date(r.startsAt) >= ninetyDaysAgo)
    .reduce((acc, r) => acc + Number(r.agreedAmount ?? 0), 0);
  const last30Revenue = allReservations
    .filter((r) => new Date(r.startsAt) >= thirtyDaysAgo)
    .reduce((acc, r) => acc + Number(r.agreedAmount ?? 0), 0);

  // Fill rate por unidad (últimos 90 días)
  const unitMetrics = units.map((u) => {
    const activeResv = u.reservations.filter((r) => new Date(r.startsAt) >= ninetyDaysAgo);
    const occupiedDays = activeResv.reduce((acc, r) => {
      const start = Math.max(new Date(r.startsAt).getTime(), ninetyDaysAgo.getTime());
      const end = Math.min(new Date(r.endsAt).getTime(), now.getTime());
      if (end <= start) return acc;
      return acc + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }, 0);
    const fillRate = Math.min(100, Math.round((occupiedDays / 90) * 100));
    const revenue = activeResv.reduce((acc, r) => acc + Number(r.agreedAmount ?? u.basePriceAmount), 0);
    return { id: u.id, name: u.name, fillRate, revenue, totalReservations: u.reservations.length, status: u.status };
  }).sort((a, b) => b.revenue - a.revenue);

  const avgFill =
    unitMetrics.length > 0
      ? Math.round(unitMetrics.reduce((a, u) => a + u.fillRate, 0) / unitMetrics.length)
      : 0;

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-led">Analíticas</p>
          <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
            Rendimiento
          </h1>
        </div>
      </header>

      {/* KPIs compactos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Publicadas", value: `${publishedUnits}/${totalUnits}` },
          { label: "Ingresos 30d", value: formatArs(last30Revenue) },
          { label: "Ingresos 90d", value: formatArs(last90Revenue) },
          { label: "Fill rate prom.", value: `${avgFill}%` },
        ].map((k) => (
          <div key={k.label} className={cn(surfaceCard(), "p-4")}>
            <p className="text-xl font-bold tabular-nums text-foreground">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla por unidad */}
      <div className={cn(surfaceCard(), "min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]")}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">Espacio</th>
              <th className="px-4 py-2">Fill rate (90d)</th>
              <th className="px-4 py-2 hidden sm:table-cell">Ingresos (90d)</th>
              <th className="px-4 py-2 hidden md:table-cell">Reservas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {unitMetrics.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-2.5 font-medium text-foreground">{u.name}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", u.fillRate >= 70 ? "bg-led" : u.fillRate >= 40 ? "bg-yellow-500" : "bg-signal")}
                        style={{ width: `${u.fillRate}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums">{u.fillRate}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-foreground hidden sm:table-cell">{formatArs(u.revenue)}</td>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground hidden md:table-cell">{u.totalReservations}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {unitMetrics.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sin unidades para mostrar.</p>
        )}
      </div>

      {/* Insights IA */}
      <YieldInsights />
    </div>
  );
}
