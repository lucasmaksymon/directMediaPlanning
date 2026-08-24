import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody, adminPageHeader, surfaceCard } from "@/lib/ui-classes";
import Link from "next/link";

import { productTitle } from "@/lib/brand";

export const metadata = { title: productTitle("Métricas") };

async function getStats() {
  const [
    totalUsers, totalProviders, totalAdvertisers,
    totalUnits, publishedUnits,
    totalReservations, pendingReservations, acceptedReservations, confirmedReservations,
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
  const totalARS = await prisma.reservation.aggregate({
    where: { status: { in: ["accepted", "confirmed"] }, agreedAmount: { not: null } },
    _sum: { agreedAmount: true },
  });
  return {
    totalUsers, totalProviders, totalAdvertisers,
    totalUnits, publishedUnits,
    totalReservations, pendingReservations, acceptedReservations, confirmedReservations,
    totalARS: Number(totalARS._sum.agreedAmount ?? 0),
  };
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const s = await getStats();

  return (
    <div className={adminPage}>
      <header className={adminPageHeader}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-led">Admin</p>
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Métricas globales
        </h1>
      </header>

      <div className={cn(adminPageBody, "flex flex-col gap-4")}>
      {/* Volumen */}
      <div className={cn(surfaceCard(), "flex items-center gap-4 px-5 py-4")}>
        <p className="text-2xl font-bold tabular-nums text-led">{formatArs(s.totalARS)}</p>
        <p className="text-xs text-muted-foreground">Total en reservas aceptadas + confirmadas</p>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Metric label="Usuarios" value={s.totalUsers} />
        <Metric label="Medios" value={s.totalProviders} />
        <Metric label="Anunciantes" value={s.totalAdvertisers} />
        <Metric label="Unidades" value={`${s.publishedUnits}/${s.totalUnits}`} accent />
        <Metric label="Pendientes" value={s.pendingReservations} urgent={s.pendingReservations > 0} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Total reservas" value={s.totalReservations} />
        <Metric label="Aceptadas" value={s.acceptedReservations} accent />
        <Metric label="Confirmadas" value={s.confirmedReservations} accent />
      </div>

      {/* Acciones rápidas */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { href: "/admin/usuarios", label: "Usuarios" },
          { href: "/admin/reservas", label: "Reservas" },
          { href: "/admin/inventario", label: "Inventario" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground hover:border-led/40 transition"
          >
            {a.label} <span className="text-led">→</span>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}

function Metric({
  label, value, urgent, accent,
}: {
  label: string; value: string | number; urgent?: boolean; accent?: boolean;
}) {
  return (
    <div className={cn(
      surfaceCard(),
      "flex flex-col p-4",
      urgent && "border-signal/40 bg-signal/5 dark:bg-signal/[0.04]",
    )}>
      <p className={cn("text-2xl font-bold tabular-nums", accent ? "text-led" : urgent ? "text-signal" : "text-foreground")}>
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
    </div>
  );
}
