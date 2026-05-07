import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { redirect } from "next/navigation";
import { AcceptForm, RejectForm } from "./ReservationActions";
import { ReservationSummary } from "@/components/reservations/ReservationSummary";
import { surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export default async function ProviderReservationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "provider" && session.user.role !== "admin") {
    redirect("/");
  }

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) {
    return (
      <p className="text-muted-foreground">
        No encontramos el perfil de tu medio. Si el problema continúa, contactá soporte.
      </p>
    );
  }

  const reservations = await prisma.reservation.findMany({
    where: { inventoryUnit: { providerId: profile.id } },
    orderBy: { createdAt: "desc" },
    include: {
      inventoryUnit: { select: { name: true } },
      advertiser: { select: { email: true } },
    },
  });

  return (
    <div className="space-y-10">
      <header className="max-w-5xl">
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">
          Solicitudes entrantes
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Revisá pedidos de disponibilidad. Las pendientes requieren aceptar o rechazar para avanzar
          el flujo con el anunciante.
        </p>
      </header>

      {reservations.length === 0 ? (
        <p className="text-muted-foreground">
          Cuando un anunciante solicite fechas sobre tus espacios, vas a ver el pedido acá.
        </p>
      ) : (
        <ul className="space-y-4">
          {reservations.map((r) => (
            <li className={cn(surfaceCard(), "p-5 sm:p-6")} key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{r.inventoryUnit.name}</p>
                  <p className="text-sm text-muted-foreground">{r.advertiser.email}</p>
                  <ReservationSummary reservationId={r.id} />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {r.startsAt.toLocaleDateString("es-AR")} — {r.endsAt.toLocaleDateString("es-AR")} ·{" "}
                    {reservationStatusLabel[r.status] ?? r.status}
                    {r.agreedAmount != null && <> · {formatArs(r.agreedAmount)}</>}
                  </p>
                </div>
                {r.status === "pending_provider" && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap gap-2">
                      <AcceptForm reservationId={r.id} />
                      <RejectForm reservationId={r.id} />
                    </div>
                  </div>
                )}
                {r.providerNote && (
                  <div className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Tu nota: </span>
                    {r.providerNote}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        <Link className="font-medium text-foreground underline underline-offset-2" href="/provider">
          Volver al panel del medio
        </Link>
      </p>
    </div>
  );
}
