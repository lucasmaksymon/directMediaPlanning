import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import { reservationStatusLabel } from "@/lib/labels";
import { AdminReservationStatus } from "./AdminReservationStatus";
import { cn } from "@/lib/cn";
import {
  adminPage,
  btnPrimary,
  fieldClass,
  labelClass,
  surfaceCard,
  tableScroll,
} from "@/lib/ui-classes";
import { productTitle } from "@/lib/brand";
import { EmptyState, FilterBar, PageHeader } from "@/components/ui/Patterns";
import { PagePager } from "@/components/ui/PagePager";
import Link from "next/link";
import { Prisma, type ReservationStatus } from "@prisma/client";
import {
  ADMIN_PAGE_SIZE,
  firstSearchParam,
  pageToSkip,
  parsePage,
  totalPages,
  withPageParam,
} from "@/lib/pagination";

export const metadata = { title: productTitle("Reservas") };

const STATUS_OPTIONS = Object.keys(reservationStatusLabel) as ReservationStatus[];

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const sp = await searchParams;
  const q = firstSearchParam(sp, "q");
  const status = firstSearchParam(sp, "status") as ReservationStatus | "";
  const page = parsePage(sp.page);
  const limit = ADMIN_PAGE_SIZE;

  const where: Prisma.ReservationWhereInput = {
    ...(status && STATUS_OPTIONS.includes(status) ? { status } : {}),
    ...(q
      ? {
          OR: [
            { inventoryUnit: { name: { contains: q, mode: "insensitive" } } },
            { inventoryUnit: { provider: { companyName: { contains: q, mode: "insensitive" } } } },
            { advertiser: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, reservations] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageToSkip(page, limit),
      take: limit,
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        agreedAmount: true,
        inventoryUnit: {
          select: { name: true, provider: { select: { companyName: true } } },
        },
        advertiser: { select: { email: true } },
      },
    }),
  ]);

  const pages = totalPages(total, limit);
  const filterState = { q: q || undefined, status: status || undefined };

  return (
    <div className={cn(adminPage, "gap-3")}>
      <PageHeader title="Reservas" />

      <form method="GET">
        <FilterBar>
          <div className="min-w-[12rem] flex-1">
            <label className={cn(labelClass, "mb-1 text-[10px] uppercase tracking-wide")} htmlFor="q">
              Buscar
            </label>
            <input
              className={cn(fieldClass, "h-8 py-1.5 text-sm")}
              defaultValue={q}
              id="q"
              name="q"
              placeholder="Espacio, medio, email…"
            />
          </div>
          <div className="w-48">
            <label className={cn(labelClass, "mb-1 text-[10px] uppercase tracking-wide")} htmlFor="status">
              Estado
            </label>
            <select
              className={cn(fieldClass, "nm-select nm-select-compact h-8 py-1.5 text-sm")}
              defaultValue={status}
              id="status"
              name="status"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {reservationStatusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className={cn(btnPrimary, "h-8 min-h-8 px-4 text-xs")} type="submit">
              Filtrar
            </button>
            <Link className="text-xs text-muted-foreground underline" href="/admin/reservas">
              Limpiar
            </Link>
          </div>
        </FilterBar>
      </form>

      <PagePager
        hrefForPage={(p) => withPageParam("/admin/reservas", filterState, p)}
        page={page}
        pageCount={pages}
        total={total}
      />

      {reservations.length === 0 ? (
        <EmptyState
          description="No hay reservas con estos filtros."
          title="Sin resultados"
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
