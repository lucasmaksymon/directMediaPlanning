import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AcceptForm, RejectForm } from "./ReservationActions";
import { cn } from "@/lib/cn";
import { adminPage } from "@/lib/ui-classes";

const statusDot: Record<string, string> = {
  pending_provider: "bg-signal",
  accepted: "bg-led",
  confirmed: "bg-led",
  rejected: "bg-muted-foreground",
  cancelled: "bg-muted-foreground",
};

export default async function ProviderReservationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const reservations = await prisma.reservation.findMany({
    where: {},
    orderBy: { createdAt: "desc" },
    include: {
      inventoryUnit: { select: { name: true } },
      advertiser: { select: { email: true } },
    },
  });

  return (
    <div className={cn(adminPage, "gap-3")}>
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Solicitudes entrantes
        </h1>
        <span className="text-xs text-muted-foreground">
          {reservations.length} total
        </span>
      </header>

      {reservations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center text-sm text-muted-foreground">
          Cuando un anunciante solicite fechas vas a ver el pedido acá.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card shadow-sm [scrollbar-gutter:stable]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Espacio</th>
                <th className="px-4 py-2 hidden sm:table-cell">Anunciante</th>
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
                      <p className="mt-0.5 text-xs text-muted-foreground italic truncate max-w-[180px]" title={r.providerNote}>
                        {r.providerNote}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{r.advertiser.email}</p>
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
                    <div className="flex items-center gap-2">
                      {r.status === "pending_provider" && (
                        <div className="flex flex-col gap-1">
                          <AcceptForm reservationId={r.id} compact />
                          <RejectForm reservationId={r.id} compact />
                        </div>
                      )}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <Link className="font-medium text-foreground underline underline-offset-2" href="/admin/operaciones">
          ← Panel del medio
        </Link>
      </p>
    </div>
  );
}
