import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/cn";

const statusDot: Record<string, string> = {
  pending_provider: "bg-signal",
  accepted: "bg-led",
  confirmed: "bg-led",
  rejected: "bg-muted-foreground",
  cancelled: "bg-muted-foreground",
};

export default async function AdvertiserReservationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "advertiser" && session.user.role !== "admin") redirect("/");

  const reservations = await prisma.reservation.findMany({
    where: { advertiserId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      inventoryUnit: { select: { name: true, locationLabel: true } },
    },
  });

  const acceptedIds = reservations
    .filter((r) => ["accepted", "confirmed"].includes(r.status))
    .map((r) => r.id);

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Mis solicitudes
        </h1>
        <div className="flex items-center gap-3">
          {acceptedIds.length > 0 && (
            <a
              href={`/api/pdf/media-plan?ids=${acceptedIds.join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-led/50 transition"
            >
              Media Plan PDF
            </a>
          )}
          <span className="text-xs text-muted-foreground">{reservations.length} total</span>
        </div>
      </header>

      {reservations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center text-sm text-muted-foreground">
          Todavía no enviaste solicitudes.{" "}
          <Link className="font-semibold text-foreground underline" href="/explorar">
            Explorar catálogo
          </Link>
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card shadow-sm [scrollbar-gutter:stable]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Espacio</th>
                <th className="px-4 py-2 hidden sm:table-cell">Ubicación</th>
                <th className="px-4 py-2 hidden md:table-cell">Fechas</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 hidden sm:table-cell">Importe</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservations.map((r) => (
                <tr key={r.id} className="group transition hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-tight">{r.inventoryUnit.name}</p>
                    {r.providerNote && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground truncate max-w-[200px]" title={r.providerNote}>
                        {r.providerNote}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{r.inventoryUnit.locationLabel}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                    <p className="text-xs text-muted-foreground">
                      {r.startsAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                      {" – "}
                      {r.endsAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[r.status] ?? "bg-muted-foreground")} />
                      {reservationStatusLabel[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                    {r.agreedAmount != null && (
                      <p className="text-xs font-semibold text-foreground">{formatArs(r.agreedAmount)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {["accepted", "confirmed"].includes(r.status) && (
                      <a
                        href={`/api/pdf/op?id=${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whitespace-nowrap rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-foreground hover:border-led/50 transition"
                      >
                        OP PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link
        href="/explorar"
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition underline underline-offset-2"
      >
        ← Explorar catálogo
      </Link>
    </div>
  );
}
