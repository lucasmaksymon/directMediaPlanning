import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma, type InventoryStatus } from "@prisma/client";
import {
  surfaceCard,
  panelPage,
  pageScroll,
  btnPrimary,
  tableScroll,
  fieldClass,
  labelClass,
} from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { formatArs } from "@/lib/format";
import { productTitle } from "@/lib/brand";
import Link from "next/link";
import { ProviderInventoryActions } from "./ProviderInventoryActions";
import { EmptyState, FilterBar, PageHeader } from "@/components/ui/Patterns";
import { Badge } from "@/components/ui/Badge";
import { PagePager } from "@/components/ui/PagePager";
import {
  ADMIN_PAGE_SIZE,
  firstSearchParam,
  pageToSkip,
  parsePage,
  totalPages,
  withPageParam,
} from "@/lib/pagination";

export const metadata = { title: productTitle("Mis espacios") };

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital OOH",
  static_ooh: "OOH Estático",
  digital_package: "Paquete Digital",
};

const statusVariant: Record<string, "brand" | "default" | "warning"> = {
  published: "brand",
  draft: "default",
  paused: "warning",
};

const statusLabels: Record<string, string> = {
  published: "Publicado",
  draft: "Borrador",
  paused: "Pausado",
};

const STATUSES: InventoryStatus[] = ["published", "draft", "paused"];

export default async function ProviderInventarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
        <EmptyState description="Perfil de proveedor no encontrado." title="Sin perfil" />
      </div>
    );
  }

  const sp = await searchParams;
  const q = firstSearchParam(sp, "q");
  const status = firstSearchParam(sp, "status") as InventoryStatus | "";
  const page = parsePage(sp.page);
  const limit = ADMIN_PAGE_SIZE;

  const where: Prisma.InventoryUnitWhereInput = {
    providerId: profile.id,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { locationLabel: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status && STATUSES.includes(status) ? { status } : {}),
  };

  const [total, units] = await Promise.all([
    prisma.inventoryUnit.count({ where }),
    prisma.inventoryUnit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pageToSkip(page, limit),
      take: limit,
      select: {
        id: true,
        name: true,
        format: true,
        locationLabel: true,
        basePriceAmount: true,
        agencyPriceAmount: true,
        status: true,
      },
    }),
  ]);

  const pages = totalPages(total, limit);
  const filterState = { q: q || undefined, status: status || undefined };

  return (
    <div className={cn(panelPage, pageScroll, "gap-5")}>
      <PageHeader
        actions={
          <Link className={btnPrimary} href="/provider/inventario/nuevo">
            + Agregar espacio
          </Link>
        }
        eyebrow="Inventario"
        title="Mis espacios"
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
              placeholder="Nombre o ubicación…"
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
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className={cn(btnPrimary, "h-8 min-h-8 px-4 text-xs")} type="submit">
              Filtrar
            </button>
            <Link className="text-xs text-muted-foreground underline" href="/provider/inventario">
              Limpiar
            </Link>
          </div>
        </FilterBar>
      </form>

      <PagePager
        hrefForPage={(p) => withPageParam("/provider/inventario", filterState, p)}
        page={page}
        pageCount={pages}
        total={total}
      />

      {units.length === 0 ? (
        <EmptyState
          actionHref="/provider/inventario/nuevo"
          actionLabel="Cargar primer espacio"
          description="No hay espacios con estos filtros."
          title="Sin resultados"
        />
      ) : (
        <div className={cn(surfaceCard(), tableScroll)}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Formato</th>
                <th className="px-5 py-3 text-left">Ubicación</th>
                <th className="px-5 py-3 text-right">Precio directo</th>
                <th className="px-5 py-3 text-right">Precio agencia</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((unit) => (
                <tr key={unit.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3 font-medium text-foreground">{unit.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatLabels[unit.format] ?? unit.format}
                  </td>
                  <td className="max-w-[180px] truncate px-5 py-3 text-muted-foreground">
                    {unit.locationLabel}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                    {formatArs(unit.basePriceAmount)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {unit.agencyPriceAmount ? formatArs(unit.agencyPriceAmount) : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={statusVariant[unit.status] ?? "default"}>
                      {statusLabels[unit.status] ?? unit.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ProviderInventoryActions
                      unitId={unit.id}
                      currentStatus={unit.status as "draft" | "published" | "paused"}
                    />
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
