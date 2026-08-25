"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreMap } from "@/components/explore/ExploreMap";
import { ExploreUnitCard } from "@/components/explore/ExploreUnitCard";
import { SearchAutocomplete } from "@/components/explore/SearchAutocomplete";
import type { ExploreFilters, ExploreMapMarker, ExploreUnitDTO } from "@/lib/explore-query";
import { buildExploreHref } from "@/lib/explore-query";
import { GEO_SUGGESTIONS } from "@/lib/geo-suggestions";
import { cn } from "@/lib/cn";
import { btnPrimary, btnSecondary, fieldClass, labelClass } from "@/lib/ui-classes";
import { EmptyState, FilterBar } from "@/components/ui/Patterns";

type Props = {
  initialUnits: ExploreUnitDTO[];
  markers: ExploreMapMarker[];
  total: number;
  hasMore: boolean;
  filters: ExploreFilters;
  providerNames: string[];
};

const FORMAT_OPTIONS = [
  { value: "digital_ooh", label: "Digital OOH" },
  { value: "static_ooh", label: "OOH estático" },
  { value: "digital_package", label: "Paquete digital" },
];

export function ExplorarExplorer({
  initialUnits,
  markers,
  total,
  hasMore: initialHasMore,
  filters,
  providerNames,
}: Props) {
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [compareMode, setCompareMode] = useState(false);
  const [units, setUnits] = useState(initialUnits);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setUnits(initialUnits);
    setPage(1);
    setHasMore(initialHasMore);
  }, [initialUnits, initialHasMore]);

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
      formato: filters.formato || undefined,
      desde: filters.desde || undefined,
      hasta: filters.hasta || undefined,
      precio_max: filters.precioMax || undefined,
    }),
    [filters],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const qs = new URLSearchParams();
      if (filters.q) qs.set("q", filters.q);
      if (filters.proveedor) qs.set("proveedor", filters.proveedor);
      if (filters.formato) qs.set("formato", filters.formato);
      if (filters.desde) qs.set("desde", filters.desde);
      if (filters.hasta) qs.set("hasta", filters.hasta);
      if (filters.precioMax) qs.set("precio_max", filters.precioMax);
      qs.set("page", String(next));
      const res = await fetch(`/api/explore/units?${qs.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as {
        units: ExploreUnitDTO[];
        hasMore: boolean;
        page: number;
      };
      setUnits((prev) => {
        const seen = new Set(prev.map((u) => u.id));
        return [...prev, ...data.units.filter((u) => !seen.has(u.id))];
      });
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }, [filters, hasMore, loadingMore, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || filters.vista === "mapa") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: el.parentElement, rootMargin: "240px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, filters.vista]);

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
              suggestions={[
                ...GEO_SUGGESTIONS.map((g) => ({
                  label: g.label,
                  sublabel: g.sublabel,
                  value: g.label,
                })),
                ...providerNames.map((p) => ({
                  label: p,
                  sublabel: "Proveedor",
                  value: p,
                })),
              ]}
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
              {providerNames.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className={labelCls} htmlFor="formato">
              Formato
            </label>
            <select
              className={cn(inputCls, "nm-select nm-select-compact")}
              defaultValue={filters.formato}
              id="formato"
              name="formato"
            >
              <option value="">Todos</option>
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label className={labelCls} htmlFor="precio_max">
              Precio máx.
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
          Mostrando{" "}
          <span className="font-semibold text-foreground">{units.length}</span> de{" "}
          <span className="font-semibold text-foreground">{total}</span>
          {markers.length > 0 && (
            <>
              {" "}
              · <span className="text-foreground/80">{markers.length}</span> en mapa
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
            {compareIds.size} seleccionado{compareIds.size !== 1 ? "s" : ""}
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

      {total === 0 ? (
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
              <li className="col-span-full">
                <div ref={sentinelRef} className="flex justify-center py-3">
                  {loadingMore ? (
                    <p className="nm-caption">Cargando más…</p>
                  ) : hasMore ? (
                    <button
                      className="text-xs font-semibold text-led underline"
                      onClick={() => void loadMore()}
                      type="button"
                    >
                      Cargar más
                    </button>
                  ) : units.length > 0 ? (
                    <p className="nm-caption">Fin de resultados</p>
                  ) : null}
                </div>
              </li>
            </ul>
          )}
          {(vista === "mapa" || vista === "ambos") && (
            <div className="min-h-0 min-w-0 overflow-hidden">
              <ExploreMap markers={markers} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
