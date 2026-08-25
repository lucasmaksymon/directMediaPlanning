import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { PageHeader, Stat, StatRow, EmptyState, SectionHeader } from "@/components/ui/Patterns";
import { buttonVariants } from "@/lib/ui-variants";

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
      <div className={cn(panelPage, pageScroll, "gap-6")}>
        <PageHeader eyebrow="Agencia" title="Panel Agencia" />
        <EmptyState
          title="Perfil no encontrado"
          description="Tu cuenta fue registrada como agencia, pero no encontramos el perfil. Contactá a soporte."
        />
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
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader
        eyebrow="Agencia"
        title={agencyProfile.companyName}
        description={`Comisión estándar: ${Number(agencyProfile.commissionPct)}%`}
      />

      <StatRow className="lg:grid-cols-4">
        <Link href="/agency/clientes" className="block">
          <Stat
            className="h-full transition hover:border-led/40"
            label="Clientes"
            value={clients.length}
          />
        </Link>
        <Link href="/agency/clientes" className="block">
          <Stat
            className="h-full transition hover:border-led/40"
            label="Campañas totales"
            value={totalCampaigns}
          />
        </Link>
        <Link href="/agency/clientes" className="block">
          <Stat
            className="h-full transition hover:border-led/40"
            label="Inversión gestionada"
            value={formatArs(totalManaged)}
          />
        </Link>
        <Link href="/agency/clientes" className="block">
          <Stat
            accent
            className="h-full transition hover:border-led/40"
            label="Comisiones totales"
            value={formatArs(totalCommissions)}
          />
        </Link>
      </StatRow>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { href: "/agency/clientes", label: "Gestionar clientes" },
          { href: "/explorar", label: "Explorar catálogo" },
          { href: "/agency/comparar", label: "Comparar espacios" },
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

      {confirmedAgencyReservations.length > 0 && (
        <div className={cn(surfaceCard(), "p-5 sm:p-6")}>
          <SectionHeader title="Comisiones acumuladas" className="mb-4" />
          <StatRow className="sm:grid-cols-3 lg:grid-cols-3">
            <Stat accent label="Total comisiones cobradas" value={formatArs(totalCommissions)} />
            <Stat label="Reservas vía agencia" value={confirmedAgencyReservations.length} />
            <Stat
              label="Comisión efectiva promedio"
              value={
                totalManaged > 0
                  ? `${Math.round((totalCommissions / totalManaged) * 100)}%`
                  : "—"
              }
            />
          </StatRow>
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyState
          title="Aún no tenés clientes"
          description="Agregá clientes para gestionar campañas y comisiones."
          actionLabel="Agregar cliente"
          actionHref="/agency/clientes"
        />
      ) : (
        <div className="space-y-4">
          <SectionHeader title="Vista consolidada de clientes" />
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
