"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap } from "@/components/explore/ExploreMap";
import { ExploreUnitCard } from "@/components/explore/ExploreUnitCard";
import { SearchAutocomplete } from "@/components/explore/SearchAutocomplete";
import type { ExploreFilters, ExploreUnitDTO } from "@/lib/explore-query";
import { buildExploreHref } from "@/lib/explore-query";
import { GEO_SUGGESTIONS } from "@/lib/geo-suggestions";
import { cn } from "@/lib/cn";
import { btnPrimary, btnSecondary, fieldClass, labelClass } from "@/lib/ui-classes";
import { EmptyState, FilterBar } from "@/components/ui/Patterns";

type Props = {
  units: ExploreUnitDTO[];
  filters: ExploreFilters;
  providerNames: string[];
};

export function ExplorarExplorer({ units, filters, providerNames }: Props) {
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
      proveedor: filters.proveedor || undefined,
      desde: filters.desde || undefined,
      hasta: filters.hasta || undefined,
      precio_max: filters.precioMax || undefined,
    }),
    [filters],
  );

  const providerOptions = providerNames;

  const withCoords = units.filter(
    (u) => u.lat != null && u.lng != null && Number.isFinite(u.lat) && Number.isFinite(u.lng),
  );

  const vista = filters.vista;

  const inputCls = cn(fieldClass, "h-8 py-1.5 text-sm");
  const labelCls = cn(labelClass, "mb-1 text-[10px] uppercase tracking-wide");

  return (
    <div className="flex h-full min-w-0 flex-col gap-3 overflow-hidden">
      <form method="GET" action="/explorar">
        <input name="vista" type="hidden" value={vista} />
        <FilterBar>
          <div className="min-w-[200px] flex-1">
            <label className={labelCls} htmlFor="q">
              Búsqueda
            </label>
            <SearchAutocomplete
              defaultValue={filters.q}
              id="q"
              inputClassName={inputCls}
              name="q"
              placeholder="Ubicación, barrio, nombre…"
              suggestions={(() => {
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

                const staticLabels = new Set(GEO_SUGGESTIONS.map((g) => g.label.toLowerCase()));

                return [
                  ...GEO_SUGGESTIONS.map((g) => ({
                    label: g.label,
                    sublabel: g.sublabel,
                    value: g.label,
                  })),
                  ...dbTokens
                    .filter((t) => !staticLabels.has(t.toLowerCase()))
                    .map((geo) => ({ label: geo, sublabel: "Zona", value: geo })),
                  ...units.map((u) => ({
                    label: u.name,
                    sublabel: `${u.providerName} · ${u.locationLabel}`,
                    value: u.name,
                  })),
                  ...providerOptions.map((p) => ({
                    label: p,
                    sublabel: "Proveedor",
                    value: p,
                  })),
                ];
              })()}
            />
          </div>

          <div className="w-36">
            <label className={labelCls} htmlFor="desde">
              Desde
            </label>
            <input
              className={inputCls}
              defaultValue={filters.desde}
              id="desde"
              name="desde"
              type="date"
            />
          </div>

          <div className="w-36">
            <label className={labelCls} htmlFor="hasta">
              Hasta
            </label>
            <input
              className={inputCls}
              defaultValue={filters.hasta}
              id="hasta"
              name="hasta"
              type="date"
            />
          </div>

          <div className="w-44">
            <label className={labelCls} htmlFor="proveedor">
              Proveedor
            </label>
            <select
              className={cn(inputCls, "nm-select nm-select-compact")}
              defaultValue={filters.proveedor}
              id="proveedor"
              name="proveedor"
            >
              <option value="">Todos</option>
              {providerOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              {filters.proveedor && !providerOptions.includes(filters.proveedor) && (
                <option value={filters.proveedor}>{filters.proveedor}</option>
              )}
            </select>
          </div>

          <div className="w-32">
            <label className={labelCls} htmlFor="precio_max">
              Precio máx. (ARS)
            </label>
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

          <div className="flex items-end gap-2">
            <button className={cn(btnPrimary, "h-8 min-h-8 px-4 text-xs")} type="submit">
              Filtrar
            </button>
            <Link className={cn(btnSecondary, "h-8 min-h-8 px-3 text-xs")} href="/explorar">
              Limpiar
            </Link>
          </div>
        </FilterBar>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{units.length}</span>{" "}
          {units.length === 1 ? "espacio" : "espacios"}
          {withCoords.length > 0 && (
            <>
              {" "}
              · <span className="text-foreground/80">{withCoords.length}</span> en mapa
            </>
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
                "rounded-[var(--radius-md)] px-3 py-1 text-xs font-medium transition",
                vista === id
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted",
              )}
              href={buildExploreHref({ ...baseParams, vista: id })}
            >
              {label}
            </Link>
          ))}
          <button
            className={cn(
              "rounded-[var(--radius-md)] border px-3 py-1 text-xs font-medium transition",
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

      {compareMode && compareIds.size > 0 && (
        <div className="sticky bottom-3 z-20 flex items-center justify-between rounded-[var(--radius-lg)] border border-led/40 bg-card/95 px-4 py-2 shadow-[var(--shadow-md)] backdrop-blur-sm">
          <p className="text-xs font-medium text-foreground">
            {compareIds.size} espacio{compareIds.size !== 1 ? "s" : ""} seleccionado
            {compareIds.size !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCompareIds(new Set())}
              type="button"
              className="text-xs text-muted-foreground transition hover:text-foreground"
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

      {units.length === 0 ? (
        <EmptyState
          className="items-center text-center"
          description="Probá otras fechas, quitá el tope de precio o ampliá la búsqueda."
          title="Sin resultados"
        />
      ) : (
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-hidden",
            vista === "ambos" ? "grid gap-4 lg:grid-cols-2" : "flex flex-col",
          )}
        >
          {(vista === "lista" || vista === "ambos") && (
            <ul
              className={cn(
                "nm-scroll grid min-h-0 min-w-0 gap-3 overflow-y-auto overflow-x-hidden pe-1",
                vista === "lista"
                  ? "h-full content-start sm:grid-cols-2 xl:grid-cols-3"
                  : "h-full content-start",
              )}
            >
              {units.map((u) => (
                <li key={u.id} className="relative min-w-0">
                  {compareMode && (
                    <button
                      type="button"
                      onClick={() => toggleCompare(u.id)}
                      className={cn(
                        "absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold transition",
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
            <div className="min-h-0 min-w-0 overflow-hidden">
              <ExploreMap units={units} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
