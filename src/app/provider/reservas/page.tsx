import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import { reservationStatusLabel } from "@/lib/labels";
import { ProviderReservationActions } from "./ProviderReservationActions";
import { EmptyState, PageHeader, SectionHeader } from "@/components/ui/Patterns";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: productTitle("Solicitudes") };

function formatDate(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ProviderReservasPage() {
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
        <EmptyState
          description="Perfil de proveedor no encontrado."
          title="Sin perfil"
        />
      </div>
    );
  }

  const reservations = await prisma.reservation.findMany({
    where: { inventoryUnit: { providerId: profile.id } },
    include: {
      inventoryUnit: { select: { name: true, locationLabel: true } },
      advertiser: {
        select: {
          email: true,
          advertiserProfile: { select: { legalName: true, phone: true } },
        },
      },
      agency: { select: { companyName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = reservations.filter((r) => r.status === "pending_provider");
  const others = reservations.filter((r) => r.status !== "pending_provider");

  return (
    <div className={cn(panelPage, pageScroll, "gap-6")}>
      <PageHeader
        description="Revisá y gestioná las solicitudes de reserva para tus espacios."
        eyebrow="Medio"
        title="Solicitudes"
      />

      {pending.length > 0 && (
        <div className="space-y-3">
          <SectionHeader title={`Esperando tu respuesta (${pending.length})`} />
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((r) => {
              const advertiserName =
                r.advertiser.advertiserProfile?.legalName ?? r.advertiser.email;
              return (
                <div key={r.id} className={cn(surfaceCard(), "space-y-3 border-signal/30 p-5")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{r.inventoryUnit.name}</p>
                      <p className="text-xs text-muted-foreground">{r.inventoryUnit.locationLabel}</p>
                    </div>
                    <Badge variant="warning">Pendiente</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Anunciante</p>
                      <p className="font-medium text-foreground">{advertiserName}</p>
                      {r.agency && (
                        <p className="text-xs text-led">vía {r.agency.companyName}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Período</p>
                      <p className="font-medium text-foreground">
                        {formatDate(r.startsAt)} – {formatDate(r.endsAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monto pactado</p>
                      <p className="font-medium text-foreground">
                        {r.agreedAmount ? formatArs(r.agreedAmount) : "A confirmar"}
                      </p>
                    </div>
                    {r.priceType === "agency" && r.commissionAmount && (
                      <div>
                        <p className="text-xs text-muted-foreground">Comisión agencia</p>
                        <p className="font-medium text-led">{formatArs(r.commissionAmount)}</p>
                      </div>
                    )}
                  </div>
                  <ProviderReservationActions reservationId={r.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <SectionHeader title="Historial" />
        {others.length === 0 && pending.length === 0 ? (
          <EmptyState
            description="Aún no recibiste solicitudes."
            title="Sin solicitudes"
          />
        ) : others.length === 0 ? null : (
          <div className={cn(surfaceCard(), "overflow-hidden")}>
            <ul className="divide-y divide-border">
              {others.map((r) => {
                const advertiserName =
                  r.advertiser.advertiserProfile?.legalName ?? r.advertiser.email;
                const st = r.status;
                const badgeVariant =
                  st === "accepted" || st === "confirmed"
                    ? "success"
                    : st === "rejected" || st === "cancelled"
                      ? "error"
                      : "default";
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{r.inventoryUnit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {advertiserName}
                        {r.agency ? ` · vía ${r.agency.companyName}` : ""} ·{" "}
                        {formatDate(r.startsAt)} – {formatDate(r.endsAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.agreedAmount && (
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          {formatArs(r.agreedAmount)}
                        </span>
                      )}
                      <Badge variant={badgeVariant}>
                        {reservationStatusLabel[st] ?? st}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
