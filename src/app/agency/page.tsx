import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import Link from "next/link";

export const metadata = { title: "Panel Agencia · Direct Planning" };

export default async function AgencyPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "agency" && session.user.role !== "admin")) redirect("/");

  const agencyProfile = await prisma.agencyProfile.findUnique({ where: { userId: session.user.id } });

  if (!agencyProfile) {
    return (
      <div className="space-y-8">
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">Panel Agencia</h1>
        <div className={cn(surfaceCard(), "p-8 text-center")}>
          <p className="text-muted-foreground">Tu cuenta fue registrada como agencia, pero no encontramos el perfil. Contactá a soporte.</p>
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

  const totalCampaigns = clients.reduce((acc, c) => acc + c.advertiser.reservations.length, 0);
  const totalRevenue = clients.reduce((acc, c) =>
    acc + c.advertiser.reservations.filter((r) => ["accepted", "confirmed"].includes(r.status)).reduce((a, r) => a + Number(r.agreedAmount ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Agencia</p>
        <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground">
          {agencyProfile.companyName}
        </h1>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Clientes", value: clients.length },
          { label: "Campañas totales", value: totalCampaigns },
          { label: "Inversión gestionada", value: formatArs(totalRevenue) },
        ].map((k) => (
          <div key={k.label} className={cn(surfaceCard(), "p-5")}>
            <p className="text-2xl font-bold text-foreground tabular-nums">{k.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Clientes y sus campañas */}
      {clients.length === 0 ? (
        <div className={cn(surfaceCard(), "py-12 text-center")}>
          <p className="text-muted-foreground">Aún no tenés clientes.</p>
          <Link href="/agency/clientes" className="mt-3 inline-flex text-sm text-led font-semibold underline">
            Agregar cliente →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vista consolidada de clientes</h2>
          {clients.map((c) => {
            const name = c.advertiser.advertiserProfile?.legalName ?? c.advertiser.email;
            return (
              <div key={c.id} className={cn(surfaceCard(), "p-5 sm:p-6")}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{c.advertiser.email}</p>
                  </div>
                  <Link href={`/advertiser`} className="text-xs text-muted-foreground hover:text-led transition">
                    {c.advertiser.reservations.length} solicitudes
                  </Link>
                </div>
                {c.advertiser.reservations.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {c.advertiser.reservations.slice(0, 3).map((r) => (
                      <li key={r.id} className="py-2 text-sm">
                        <span className="font-medium text-foreground">{r.inventoryUnit.name}</span>
                        <span className="ml-2 text-muted-foreground">· {reservationStatusLabel[r.status] ?? r.status}</span>
                        {r.agreedAmount && <span className="ml-2 text-muted-foreground">· {formatArs(r.agreedAmount)}</span>}
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
