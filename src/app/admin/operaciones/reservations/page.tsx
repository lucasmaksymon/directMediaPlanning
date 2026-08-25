import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AcceptForm, RejectForm } from "./ReservationActions";
import { cn } from "@/lib/cn";
import { adminPage, surfaceCard, tableScroll } from "@/lib/ui-classes";
import { EmptyState, PageHeader } from "@/components/ui";

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
      <PageHeader
        actions={<span className="text-xs text-muted-foreground">{reservations.length} total</span>}
        title="Solicitudes entrantes"
      />

      {reservations.length === 0 ? (
        <EmptyState
          description="Cuando un anunciante solicite fechas vas a ver el pedido acá."
          title="Sin solicitudes"
        />
      ) : (
        <div className={cn(surfaceCard(), tableScroll, "min-h-0 flex-1")}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Espacio</th>
                <th className="hidden px-4 py-2 sm:table-cell">Anunciante</th>
                <th className="hidden px-4 py-2 md:table-cell">Fechas</th>
                <th className="px-4 py-2">Estado</th>
                <th className="hidden px-4 py-2 sm:table-cell">Importe</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservations.map((r) => (
                <tr key={r.id} className="group transition hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="leading-tight font-medium text-foreground">{r.inventoryUnit.name}</p>
                    {r.providerNote && (
                      <p
                        className="mt-0.5 max-w-[180px] truncate text-xs italic text-muted-foreground"
                        title={r.providerNote}
                      >
                        {r.providerNote}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="max-w-[160px] truncate text-xs text-muted-foreground">
                      {r.advertiser.email}
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                    <p className="text-xs text-muted-foreground">
                      {r.startsAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                      {" – "}
                      {r.endsAt.toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusDot[r.status] ?? "bg-muted-foreground",
                        )}
                      />
                      {reservationStatusLabel[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
                    {r.agreedAmount != null && (
                      <p className="text-xs font-semibold text-foreground">{formatArs(r.agreedAmount)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.status === "pending_provider" && (
                        <div className="flex flex-col gap-1">
                          <AcceptForm compact reservationId={r.id} />
                          <RejectForm compact reservationId={r.id} />
                        </div>
                      )}
                      {["accepted", "confirmed"].includes(r.status) && (
                        <a
                          className="whitespace-nowrap rounded-[var(--radius-md)] border border-border px-2 py-1 text-[10px] font-semibold text-foreground transition hover:border-led/50"
                          href={`/api/pdf/op?id=${r.id}`}
                          rel="noopener noreferrer"
                          target="_blank"
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
