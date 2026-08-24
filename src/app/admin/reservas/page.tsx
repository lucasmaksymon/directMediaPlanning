import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { AdminReservationStatus } from "./AdminReservationStatus";
import { cn } from "@/lib/cn";
import { adminPage } from "@/lib/ui-classes";
import { productTitle } from "@/lib/brand";

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
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Reservas
        </h1>
        <span className="text-xs text-muted-foreground">{reservations.length} total</span>
      </header>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-border bg-card shadow-sm [scrollbar-gutter:stable]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">Espacio</th>
              <th className="px-4 py-2 hidden sm:table-cell">Medio</th>
              <th className="px-4 py-2 hidden md:table-cell">Anunciante</th>
              <th className="px-4 py-2 hidden lg:table-cell">Fechas</th>
              <th className="px-4 py-2 hidden sm:table-cell">Monto</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reservations.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  <span className="block truncate max-w-[180px]">{r.inventoryUnit.name}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{r.inventoryUnit.provider.companyName}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                  <span className="block truncate max-w-[160px]">{r.advertiser.email}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                  {r.startsAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} – {r.endsAt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5 text-xs tabular-nums text-foreground hidden sm:table-cell">
                  {r.agreedAmount ? formatArs(r.agreedAmount) : "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
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
    </div>
  );
}
