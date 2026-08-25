import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { AdminReservationStatus } from "./AdminReservationStatus";
import { cn } from "@/lib/cn";
import { adminPage, surfaceCard, tableScroll } from "@/lib/ui-classes";
import { productTitle } from "@/lib/brand";
import { EmptyState, PageHeader } from "@/components/ui/Patterns";

export const metadata = { title: productTitle("Reservas") };

export default async function AdminReservasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      inventoryUnit: {
        select: { name: true, provider: { select: { companyName: true } } },
      },
      advertiser: { select: { email: true } },
    },
  });

  return (
    <div className={cn(adminPage, "gap-3")}>
      <PageHeader
        actions={
          <span className="text-xs text-muted-foreground">{reservations.length} total</span>
        }
        title="Reservas"
      />

      {reservations.length === 0 ? (
        <EmptyState
          description="Todavía no hay solicitudes de reserva en la plataforma."
          title="Sin reservas"
        />
      ) : (
        <div className={cn(surfaceCard(), tableScroll, "min-h-0 flex-1")}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Espacio</th>
                <th className="hidden px-4 py-2 sm:table-cell">Medio</th>
                <th className="hidden px-4 py-2 md:table-cell">Anunciante</th>
                <th className="hidden px-4 py-2 lg:table-cell">Fechas</th>
                <th className="hidden px-4 py-2 sm:table-cell">Monto</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservations.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <span className="block max-w-[180px] truncate">{r.inventoryUnit.name}</span>
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-muted-foreground sm:table-cell">
                    {r.inventoryUnit.provider.companyName}
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                    <span className="block max-w-[160px] truncate">{r.advertiser.email}</span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
                    {r.startsAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} –{" "}
                    {r.endsAt.toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs tabular-nums text-foreground sm:table-cell">
                    {r.agreedAmount ? formatArs(r.agreedAmount) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                    {reservationStatusLabel[r.status] ?? r.status}
                  </td>
                  <td className="px-4 py-2.5">
                    <AdminReservationStatus reservationId={r.id} currentStatus={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
