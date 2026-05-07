"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ExploreMap } from "@/components/explore/ExploreMap";
import { ExploreUnitCard } from "@/components/explore/ExploreUnitCard";
import type { ExploreFilters, ExploreProviderOption, ExploreUnitDTO } from "@/lib/explore-query";
import { buildExploreHref } from "@/lib/explore-query";
import { cn } from "@/lib/cn";
import { btnPrimary, fieldClass, surfaceCard } from "@/lib/ui-classes";

type Props = {
  units: ExploreUnitDTO[];
  providers: ExploreProviderOption[];
  filters: ExploreFilters;
};

const filterLabel =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export function ExplorarExplorer({ units, providers, filters }: Props) {
  const baseParams = useMemo(
    () => ({
      q: filters.q || undefined,
      proveedor: filters.providerId || undefined,
      desde: filters.desde || undefined,
      hasta: filters.hasta || undefined,
      precio_max: filters.precioMax || undefined,
    }),
    [filters],
  );

  const withCoords = units.filter(
    (u) => u.lat != null && u.lng != null && Number.isFinite(u.lat) && Number.isFinite(u.lng),
  );

  const vista = filters.vista;

  return (
    <div className="space-y-8">
      <form className={cn(surfaceCard(), "p-5 sm:p-6")} method="GET" action="/explorar">
        <input name="vista" type="hidden" value={vista} />
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-4">
            <label className={filterLabel} htmlFor="q">
              Ubicación o palabra clave
            </label>
            <input
              className={cn(fieldClass, "mt-1.5")}
              defaultValue={filters.q}
              id="q"
              name="q"
              placeholder="Ciudad, barrio, nombre del espacio…"
              type="search"
            />
          </div>
          <div className="lg:col-span-3">
            <label className={filterLabel} htmlFor="proveedor">
              Medio / proveedor
            </label>
            <select
              className={cn(fieldClass, "mt-1.5")}
              defaultValue={filters.providerId}
              id="proveedor"
              name="proveedor"
            >
              <option value="">Todos</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companyName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-3">
            <div>
              <label className={filterLabel} htmlFor="desde">
                Disponible desde
              </label>
              <input
                className={cn(fieldClass, "mt-1.5")}
                defaultValue={filters.desde}
                id="desde"
                name="desde"
                type="date"
              />
            </div>
            <div>
              <label className={filterLabel} htmlFor="hasta">
                Hasta
              </label>
              <input
                className={cn(fieldClass, "mt-1.5")}
                defaultValue={filters.hasta}
                id="hasta"
                name="hasta"
                type="date"
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className={filterLabel} htmlFor="precio_max">
              Precio máx. (ARS)
            </label>
            <input
              className={cn(fieldClass, "mt-1.5")}
              defaultValue={filters.precioMax}
              id="precio_max"
              inputMode="decimal"
              name="precio_max"
              placeholder="Sin tope"
              step="1000"
              type="number"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className={btnPrimary} type="submit">
            Aplicar filtros
          </button>
          <Link
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href="/explorar"
          >
            Limpiar
          </Link>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          El filtro de fechas muestra espacios sin reservas confirmadas o en curso que choquen con ese
          rango. El precio es de referencia publicado por el medio.
        </p>
      </form>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{units.length}</span>{" "}
          {units.length === 1 ? "espacio encontrado" : "espacios encontrados"}
          {withCoords.length > 0 && (
            <>
              {" "}
              ·{" "}
              <span className="font-medium text-foreground/90">{withCoords.length}</span>{" "}
              con ubicación en mapa
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ver
          </span>
          {(
            [
              { id: "lista" as const, label: "Lista" },
              { id: "mapa" as const, label: "Mapa" },
              { id: "ambos" as const, label: "Lista y mapa" },
            ] as const
          ).map(({ id, label }) => (
            <Link
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                vista === id
                  ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_16px_rgba(0,182,199,0.35)]"
                  : "border border-border bg-card text-foreground hover:bg-muted",
              )}
              href={buildExploreHref({ ...baseParams, vista: id })}
              key={id}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {units.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center text-muted-foreground backdrop-blur-sm">
          No hay resultados con estos criterios. Probá otras fechas, quitá el tope de precio o ampliá
          la búsqueda.
        </p>
      ) : (
        <div
          className={
            vista === "ambos"
              ? "grid gap-8 lg:grid-cols-2 lg:items-start"
              : vista === "mapa"
                ? "space-y-4"
                : "space-y-4"
          }
        >
          {(vista === "lista" || vista === "ambos") && (
            <ul
              className={
                vista === "ambos"
                  ? "grid max-h-[min(70vh,640px)] gap-4 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
                  : "grid gap-4 sm:grid-cols-2"
              }
            >
              {units.map((u) => (
                <ExploreUnitCard key={u.id} u={u} />
              ))}
            </ul>
          )}
          {(vista === "mapa" || vista === "ambos") && (
            <div className={vista === "ambos" ? "min-w-0 lg:sticky lg:top-20" : ""}>
              <ExploreMap units={units} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
