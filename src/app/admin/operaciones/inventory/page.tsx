import Link from "next/link";
import { auth } from "@/auth";
import { formatArs } from "@/lib/format";
import { inventoryStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Prisma, type InventoryStatus } from "@prisma/client";
import { adminPage, btnPrimary, fieldClass, labelClass, surfaceCard, tableScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { EmptyState, FilterBar, PageHeader } from "@/components/ui/Patterns";
import { PagePager } from "@/components/ui/PagePager";
import {
  ADMIN_PAGE_SIZE,
  firstSearchParam,
  pageToSkip,
  parsePage,
  totalPages,
  withPageParam,
} from "@/lib/pagination";

const statusDot: Record<string, string> = {
  published: "bg-led",
  draft: "bg-muted-foreground",
  paused: "bg-signal",
};

const STATUSES: InventoryStatus[] = ["published", "draft", "paused"];

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const sp = await searchParams;
  const q = firstSearchParam(sp, "q");
  const status = firstSearchParam(sp, "status") as InventoryStatus | "";
  const proveedor = firstSearchParam(sp, "proveedor");
  const page = parsePage(sp.page);
  const limit = ADMIN_PAGE_SIZE;

  const where: Prisma.InventoryUnitWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { locationLabel: { contains: q, mode: "insensitive" } },
            { provider: { companyName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(status && STATUSES.includes(status) ? { status } : {}),
    ...(proveedor
      ? { provider: { companyName: { equals: proveedor, mode: "insensitive" } } }
      : {}),
  };

  const [total, units, providers] = await Promise.all([
    prisma.inventoryUnit.count({ where }),
    prisma.inventoryUnit.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: pageToSkip(page, limit),
      take: limit,
      select: {
        id: true,
        name: true,
        locationLabel: true,
        basePriceAmount: true,
        status: true,
        provider: { select: { companyName: true } },
      },
    }),
    prisma.providerProfile.findMany({
      where: { inventoryUnits: { some: {} } },
      select: { companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  const pages = totalPages(total, limit);
  const filterState = {
    q: q || undefined,
    status: status || undefined,
    proveedor: proveedor || undefined,
  };

  return (
    <div className={cn(adminPage, "gap-3")}>
      <PageHeader
        actions={
          <Link className={cn(btnPrimary, "px-3 py-1.5 text-xs")} href="/admin/operaciones/inventory/new">
            + Nueva unidad
          </Link>
        }
        title="Inventario"
      />

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
              placeholder="Nombre, ubicación, proveedor…"
            />
          </div>
          <div className="w-40">
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {inventoryStatusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <label className={cn(labelClass, "mb-1 text-[10px] uppercase tracking-wide")} htmlFor="proveedor">
              Proveedor
            </label>
            <select
              className={cn(fieldClass, "nm-select nm-select-compact h-8 py-1.5 text-sm")}
              defaultValue={proveedor}
              id="proveedor"
              name="proveedor"
            >
              <option value="">Todos</option>
              {providers.map((p) => (
                <option key={p.companyName} value={p.companyName}>
                  {p.companyName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className={cn(btnPrimary, "h-8 min-h-8 px-4 text-xs")} type="submit">
              Filtrar
            </button>
            <Link className="text-xs text-muted-foreground underline" href="/admin/operaciones/inventory">
              Limpiar
            </Link>
          </div>
        </FilterBar>
      </form>

      <PagePager
        hrefForPage={(p) => withPageParam("/admin/operaciones/inventory", filterState, p)}
        page={page}
        pageCount={pages}
        total={total}
      />

      {units.length === 0 ? (
        <EmptyState
          actionHref="/admin/operaciones/inventory/new"
          actionLabel="Crear primera unidad"
          description="No hay unidades con estos filtros."
          title="Sin resultados"
        />
      ) : (
        <div className={cn(surfaceCard(), tableScroll, "min-h-0 flex-1")}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Nombre</th>
                <th className="hidden px-4 py-2 sm:table-cell">Proveedor</th>
                <th className="hidden px-4 py-2 sm:table-cell">Ubicación</th>
                <th className="hidden px-4 py-2 md:table-cell">Precio base</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.id} className="group transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="leading-tight font-medium text-foreground">{u.name}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="max-w-[140px] truncate text-xs text-muted-foreground">
                      {u.provider.companyName}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {u.locationLabel}
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                    <p className="text-xs font-semibold text-foreground">
                      {formatArs(u.basePriceAmount)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusDot[u.status] ?? "bg-muted-foreground",
                        )}
                      />
                      {inventoryStatusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        className="text-xs font-semibold text-muted-foreground underline underline-offset-2 transition hover:text-led"
                        href={`/admin/operaciones/inventory/${u.id}/disponibilidad`}
                      >
                        Calendario
                      </Link>
                      <Link
                        className="text-xs font-semibold text-foreground underline underline-offset-2 transition hover:text-led"
                        href={`/admin/operaciones/inventory/${u.id}/edit`}
                      >
                        Editar
                      </Link>
                    </div>
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
