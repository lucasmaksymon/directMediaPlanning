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
  const totalARS = await prisma.reservation.aggregate({
    where: { status: { in: ["accepted", "confirmed"] }, agreedAmount: { not: null } },
    _sum: { agreedAmount: true },
  });
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
        eyebrow="Admin"
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

        <StatRow className="sm:grid-cols-3 lg:grid-cols-3">
          <Stat label="Total reservas" value={s.totalReservations} />
          <Stat accent label="Aceptadas" value={s.acceptedReservations} />
          <Stat accent label="Confirmadas" value={s.confirmedReservations} />
        </StatRow>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { href: "/admin/usuarios", label: "Usuarios" },
            { href: "/admin/reservas", label: "Reservas" },
            { href: "/admin/inventario", label: "Inventario" },
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
