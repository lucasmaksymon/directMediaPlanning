"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap } from "@/components/explore/ExploreMap";
import { ExploreUnitCard } from "@/components/explore/ExploreUnitCard";
import { SearchAutocomplete } from "@/components/explore/SearchAutocomplete";
import type { ExploreFilters, ExploreProviderOption, ExploreUnitDTO } from "@/lib/explore-query";
import { buildExploreHref } from "@/lib/explore-query";
import { GEO_SUGGESTIONS } from "@/lib/geo-suggestions";
import { cn } from "@/lib/cn";
import { btnPrimary } from "@/lib/ui-classes";

type Props = {
  units: ExploreUnitDTO[];
  providers: ExploreProviderOption[];
  filters: ExploreFilters;
};

export function ExplorarExplorer({ units, providers, filters }: Props) {
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [compareMode, setCompareMode] = useState(false);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

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

  const inputCls =
    "h-8 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
  const labelCls = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* Barra de filtros */}
      <form
        method="GET"
        action="/explorar"
        className="rounded-xl border border-border bg-card px-4 py-3"
      >
        <input name="vista" type="hidden" value={vista} />
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {/* Búsqueda con autocompletado */}
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="q">Búsqueda</label>
            <SearchAutocomplete
              defaultValue={filters.q}
              id="q"
              inputClassName={inputCls}
              name="q"
              placeholder="Ubicación, barrio, nombre…"
              suggestions={(() => {
                // Tokens geográficos extraídos de unidades existentes
                const dbTokens = Array.from(
                  new Set(
                    units.flatMap((u) =>
                      (u.locationLabel ?? "")
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 2),
                    ),
                  ),
                );

                // Labels ya cubiertos por sugerencias estáticas (para no duplicar)
                const staticLabels = new Set(GEO_SUGGESTIONS.map((g) => g.label.toLowerCase()));

                return [
                  // 1. Sugerencias geográficas estáticas (barrios, ciudades, provincias)
                  ...GEO_SUGGESTIONS.map((g) => ({
                    label: g.label,
                    sublabel: g.sublabel,
                    value: g.label,
                  })),
                  // 2. Tokens geográficos de la BD no cubiertos por las estáticas
                  ...dbTokens
                    .filter((t) => !staticLabels.has(t.toLowerCase()))
                    .map((geo) => ({ label: geo, sublabel: "Zona", value: geo })),
                  // 3. Nombres de unidades
                  ...units.map((u) => ({
                    label: u.name,
                    sublabel: u.locationLabel,
                    value: u.name,
                  })),
                  // 4. Nombres de medios
                  ...providers.map((p) => ({
                    label: p.companyName,
                    sublabel: "Medio",
                    value: p.companyName,
                  })),
                ];
              })()}
            />
          </div>

          {/* Medio */}
          <div className="min-w-[160px] flex-[0_1_200px]">
            <label className={labelCls} htmlFor="proveedor">Medio</label>
            <select
              className={inputCls}
              defaultValue={filters.providerId}
              id="proveedor"
              name="proveedor"
            >
              <option value="">Todos</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.companyName}</option>
              ))}
            </select>
          </div>

          {/* Desde */}
          <div className="w-36">
            <label className={labelCls} htmlFor="desde">Desde</label>
            <input
              className={inputCls}
              defaultValue={filters.desde}
              id="desde"
              name="desde"
              type="date"
            />
          </div>

          {/* Hasta */}
          <div className="w-36">
            <label className={labelCls} htmlFor="hasta">Hasta</label>
            <input
              className={inputCls}
              defaultValue={filters.hasta}
              id="hasta"
              name="hasta"
              type="date"
            />
          </div>

          {/* Precio máx */}
          <div className="w-32">
            <label className={labelCls} htmlFor="precio_max">Precio máx. (ARS)</label>
            <input
              className={inputCls}
              defaultValue={filters.precioMax}
              id="precio_max"
              inputMode="decimal"
              name="precio_max"
              placeholder="Sin tope"
              step="1000"
              type="number"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-end gap-2">
            <button className={cn(btnPrimary, "h-8 px-4 text-xs")} type="submit">
              Filtrar
            </button>
            <Link
              className="flex h-8 items-center whitespace-nowrap rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:text-foreground"
              href="/explorar"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Barra de controles: resultados + vista + comparar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{units.length}</span>{" "}
          {units.length === 1 ? "espacio" : "espacios"}
          {withCoords.length > 0 && (
            <> · <span className="text-foreground/80">{withCoords.length}</span> en mapa</>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "lista" as const, label: "Lista" },
              { id: "mapa" as const, label: "Mapa" },
              { id: "ambos" as const, label: "Ambos" },
            ] as const
          ).map(({ id, label }) => (
            <Link
              key={id}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                vista === id
                  ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_12px_rgba(0,182,199,0.3)]"
                  : "border border-border bg-card text-foreground hover:bg-muted",
              )}
              href={buildExploreHref({ ...baseParams, vista: id })}
            >
              {label}
            </Link>
          ))}
          <button
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition border",
              compareMode
                ? "border-led bg-led/10 text-led"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            onClick={() => {
              setCompareMode((v) => !v);
              setCompareIds(new Set());
            }}
            type="button"
          >
            {compareMode ? `Comparar (${compareIds.size}/4)` : "Comparar"}
          </button>
        </div>
      </div>

      {/* Barra flotante de comparación */}
      {compareMode && compareIds.size > 0 && (
        <div className="sticky bottom-3 z-20 flex items-center justify-between rounded-xl border border-led/40 bg-card/95 px-4 py-2 shadow-lg backdrop-blur-sm">
          <p className="text-xs font-medium text-foreground">
            {compareIds.size} espacio{compareIds.size !== 1 ? "s" : ""} seleccionado{compareIds.size !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCompareIds(new Set())}
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Limpiar
            </button>
            <button
              onClick={() =>
                router.push(`/explorar/comparar?ids=${Array.from(compareIds).join(",")}`)
              }
              className={cn(btnPrimary, "px-3 py-1 text-xs")}
              type="button"
            >
              Comparar →
            </button>
          </div>
        </div>
      )}

      {/* Resultados — área que scrollea internamente */}
      {units.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center text-sm text-muted-foreground">
          Sin resultados. Probá otras fechas, quitá el tope de precio o ampliá la búsqueda.
        </p>
      ) : (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden",
            vista === "ambos" ? "grid gap-4 lg:grid-cols-2" : "flex flex-col",
          )}
        >
          {(vista === "lista" || vista === "ambos") && (
            <ul
              className={cn(
                "grid gap-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]",
                vista === "lista" ? "sm:grid-cols-2 xl:grid-cols-3 h-full content-start" : "h-full content-start",
              )}
            >
              {units.map((u) => (
                <li key={u.id} className="relative">
                  {compareMode && (
                    <button
                      type="button"
                      onClick={() => toggleCompare(u.id)}
                      className={cn(
                        "absolute top-2 right-2 z-10 h-5 w-5 rounded-full border-2 flex items-center justify-center transition text-[10px] font-bold",
                        compareIds.has(u.id)
                          ? "border-led bg-led text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-led",
                      )}
                    >
                      {compareIds.has(u.id) ? "✓" : "+"}
                    </button>
                  )}
                  <ExploreUnitCard u={u} />
                </li>
              ))}
            </ul>
          )}
          {(vista === "mapa" || vista === "ambos") && (
            <div className="min-h-0 overflow-hidden">
              <ExploreMap units={units} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
