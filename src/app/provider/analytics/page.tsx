import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";

export const metadata = { title: productTitle("Analytics") };

export default async function ProviderAnalyticsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "provider" && session.user.role !== "admin")) {
    redirect("/");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return (
      <div className={cn(panelPage, pageScroll)}>
        <div className={cn(surfaceCard(), "p-8 text-center")}>
          <p className="text-muted-foreground">Perfil de proveedor no encontrado.</p>
        </div>
      </div>
    );
  }

  const [totalUnits, publishedUnits, units] = await Promise.all([
    prisma.inventoryUnit.count({ where: { providerId: profile.id } }),
    prisma.inventoryUnit.count({ where: { providerId: profile.id, status: "published" } }),
    prisma.inventoryUnit.findMany({
      where: { providerId: profile.id },
      include: {
        reservations: {
          select: { status: true, agreedAmount: true, startsAt: true, endsAt: true },
        },
      },
      orderBy: { basePriceAmount: "desc" },
    }),
  ]);

  const allReservations = units.flatMap((u) => u.reservations);
  const confirmedReservations = allReservations.filter((r) =>
    ["accepted", "confirmed"].includes(r.status),
  );
  const totalRevenue = confirmedReservations.reduce((acc, r) => acc + Number(r.agreedAmount ?? 0), 0);
  const pendingCount = allReservations.filter((r) => r.status === "pending_provider").length;
  const rejectedCount = allReservations.filter((r) => r.status === "rejected").length;
  const fillRate = totalUnits > 0 ? Math.round((publishedUnits / totalUnits) * 100) : 0;

  // Ingresos por espacio
  const unitMetrics = units.map((u) => {
    const confirmed = u.reservations.filter((r) => ["accepted", "confirmed"].includes(r.status));
    const revenue = confirmed.reduce((acc, r) => acc + Number(r.agreedAmount ?? 0), 0);
    return {
      id: u.id,
      name: u.name,
      locationLabel: u.locationLabel,
      status: u.status,
      basePriceAmount: u.basePriceAmount,
      reservationsCount: u.reservations.length,
      confirmedCount: confirmed.length,
      revenue,
    };
  });

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Analytics</p>
        <h1 className="font-display mt-1 text-2xl font-normal uppercase tracking-wide text-foreground">
          Rendimiento
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Métricas de ocupación e ingresos de tus espacios publicitarios.
        </p>
      </div>

      {/* KPIs globales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Ingresos totales", value: formatArs(totalRevenue), accent: true },
          { label: "Reservas confirmadas", value: confirmedReservations.length },
          { label: "Solicitudes pendientes", value: pendingCount, urgent: pendingCount > 0 },
          { label: "Fill Rate", value: `${fillRate}%` },
        ].map((k) => (
          <div
            key={k.label}
            className={cn(
              surfaceCard(),
              "p-5",
              k.urgent && "border-signal/30",
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
          </div>
        ))}
      </div>

      {/* Tabla por espacio */}
      {unitMetrics.length > 0 && (
        <div className={cn(surfaceCard(), "overflow-hidden")}>
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Rendimiento por espacio
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 text-left">Espacio</th>
                  <th className="px-5 py-3 text-right">Precio base</th>
                  <th className="px-5 py-3 text-right">Solicitudes</th>
                  <th className="px-5 py-3 text-right">Confirmadas</th>
                  <th className="px-5 py-3 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {unitMetrics.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.locationLabel}</p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">
                      {formatArs(u.basePriceAmount)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                      {u.reservationsCount}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={cn(u.confirmedCount > 0 ? "text-led" : "text-muted-foreground")}>
                        {u.confirmedCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">
                      {formatArs(u.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-5 py-3 font-semibold text-foreground" colSpan={4}>
                    Total ingresos
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold text-led">
                    {formatArs(totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Desglose de solicitudes */}
      {allReservations.length > 0 && (
        <div className={cn(surfaceCard(), "p-5 sm:p-6")}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Distribución de solicitudes
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Pendientes", value: pendingCount, color: "text-signal" },
              { label: "Aceptadas", value: confirmedReservations.length, color: "text-led" },
              { label: "Rechazadas", value: rejectedCount, color: "text-muted-foreground" },
              { label: "Total", value: allReservations.length, color: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={cn("text-3xl font-bold tabular-nums", s.color)}>{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
