import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { surfaceCard, panelPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import { reservationStatusLabel } from "@/lib/labels";
import { ProviderReservationActions } from "./ProviderReservationActions";

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
        <div className={cn(surfaceCard(), "p-8 text-center")}>
          <p className="text-muted-foreground">Perfil de proveedor no encontrado.</p>
        </div>
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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Medio</p>
        <h1 className="font-display mt-1 text-2xl font-normal uppercase tracking-wide text-foreground">
          Solicitudes
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisá y gestioná las solicitudes de reserva para tus espacios.
        </p>
      </div>

      {/* Pendientes */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-signal">
            Esperando tu respuesta ({pending.length})
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((r) => {
              const advertiserName =
                r.advertiser.advertiserProfile?.legalName ?? r.advertiser.email;
              return (
                <div key={r.id} className={cn(surfaceCard(), "border-signal/30 p-5 space-y-3")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{r.inventoryUnit.name}</p>
                      <p className="text-xs text-muted-foreground">{r.inventoryUnit.locationLabel}</p>
                    </div>
                    <span className="rounded-full bg-signal/15 px-2.5 py-0.5 text-xs font-semibold text-signal">
                      Pendiente
                    </span>
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

      {/* Historial */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Historial
        </h2>
        {others.length === 0 && pending.length === 0 ? (
          <div className={cn(surfaceCard(), "p-8 text-center")}>
            <p className="text-muted-foreground">Aún no recibiste solicitudes.</p>
          </div>
        ) : others.length === 0 ? null : (
          <div className={cn(surfaceCard(), "overflow-hidden")}>
            <ul className="divide-y divide-border">
              {others.map((r) => {
                const advertiserName =
                  r.advertiser.advertiserProfile?.legalName ?? r.advertiser.email;
                const st = r.status;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{r.inventoryUnit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {advertiserName}
                        {r.agency ? ` · vía ${r.agency.companyName}` : ""} · {formatDate(r.startsAt)} – {formatDate(r.endsAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.agreedAmount && (
                        <span className="tabular-nums text-sm font-medium text-foreground">
                          {formatArs(r.agreedAmount)}
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          st === "accepted" || st === "confirmed"
                            ? "bg-led/15 text-led"
                            : st === "rejected" || st === "cancelled"
                            ? "bg-signal/15 text-signal"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {reservationStatusLabel[st] ?? st}
                      </span>
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
