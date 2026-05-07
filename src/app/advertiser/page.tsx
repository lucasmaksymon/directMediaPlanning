import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export default async function AdvertiserReservationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "advertiser" && session.user.role !== "admin") {
    redirect("/");
  }

  const reservations = await prisma.reservation.findMany({
    where: { advertiserId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      inventoryUnit: { select: { name: true, locationLabel: true } },
    },
  });

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">
          Mis solicitudes
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Seguimiento de cada pedido de disponibilidad. El acuerdo económico y la facturación los
          coordinás directamente con el medio.
        </p>
      </header>

      {reservations.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center text-muted-foreground backdrop-blur-sm">
          Todavía no enviaste solicitudes.{" "}
          <Link className="font-semibold text-foreground underline" href="/explorar">
            Explorar el catálogo
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-sm nm-glow dark:bg-gradient-to-b dark:from-ocean dark:to-[#071012]">
          {reservations.map((r) => (
            <li className="px-5 py-5 sm:px-6" key={r.id}>
              <p className="font-medium text-foreground">{r.inventoryUnit.name}</p>
              <p className="text-sm text-muted-foreground">{r.inventoryUnit.locationLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {r.startsAt.toLocaleDateString("es-AR")} — {r.endsAt.toLocaleDateString("es-AR")} ·{" "}
                {reservationStatusLabel[r.status] ?? r.status}
                {r.agreedAmount != null && <> · {formatArs(r.agreedAmount)}</>}
              </p>
              {r.providerNote && (
                <p className="mt-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Nota del medio: </span>
                  {r.providerNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link
        className={cn(
          surfaceCard(),
          "block p-5 text-sm font-medium text-foreground transition hover:border-led/40",
        )}
        href="/explorar"
      >
        Ir al catálogo público →
      </Link>
    </div>
  );
}
