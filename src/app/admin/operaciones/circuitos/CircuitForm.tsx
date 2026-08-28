"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { btnPrimary, fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";

type Unit = {
  id: string;
  name: string;
  locationLabel: string;
  format: string;
  basePriceAmount: string;
};

export type CircuitFormInitial = {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  unitIds: string[];
};

export function CircuitForm({
  units,
  circuit,
}: {
  units: Unit[];
  circuit?: CircuitFormInitial;
}) {
  const isEdit = Boolean(circuit);

  const [name, setName] = useState(circuit?.name ?? "");
  const [description, setDescription] = useState(circuit?.description ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(circuit?.unitIds ?? []),
  );
  const [isPublished, setIsPublished] = useState(circuit?.isPublished ?? false);
  const [isPending, startTransition] = useTransition();
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggleUnit(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAiDescribe() {
    if (selectedIds.size === 0) {
      setError("Seleccioná al menos un espacio.");
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/circuit-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.name && !name.trim()) setName(data.name);
      if (data.description) setDescription(data.description);
    } catch {
      setError("No se pudo generar descripción con IA.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ingresá un nombre para el circuito.");
      return;
    }
    if (selectedIds.size < 2) {
      setError("Un circuito necesita al menos 2 espacios.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description,
        unitIds: Array.from(selectedIds),
        isPublished,
      };
      const res = await fetch(
        isEdit ? `/api/provider/circuits/${circuit!.id}` : "/api/provider/circuits",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        router.push("/admin/operaciones/circuitos");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? (isEdit ? "Error al guardar circuito." : "Error al crear circuito."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:h-full lg:overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(260px,380px)_1fr]">
      <div className={cn(surfaceCard(), "flex flex-col gap-4 p-5 sm:p-6 lg:min-h-0")}>
        <h2 className="text-base font-semibold text-foreground">Información del circuito</h2>
        <div>
          <label className={labelClass} htmlFor="circuit-name">
            Nombre
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="circuit-name"
            placeholder="Ej. Circuito Centro Rosario"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className={labelClass} htmlFor="circuit-desc">
              Descripción comercial
            </label>
            <button
              type="button"
              onClick={handleAiDescribe}
              disabled={aiLoading || selectedIds.size === 0}
              className="text-xs font-semibold text-led disabled:opacity-40 hover:underline"
            >
              {aiLoading ? "Generando…" : "✦ Generar con IA"}
            </button>
          </div>
          <textarea
            className={cn(fieldClass, "mt-1.5 min-h-[100px] resize-none")}
            id="circuit-desc"
            placeholder="Describí la cobertura, zonas y perfil de audiencia del circuito"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublished((v) => !v)}
            className={cn(
              "relative h-6 w-11 rounded-full border-2 transition-colors",
              isPublished ? "border-led bg-led" : "border-border bg-muted",
            )}
            role="switch"
            aria-checked={isPublished}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                isPublished ? "left-5" : "left-0.5",
              )}
            />
          </button>
          <label className={labelClass}>
            {isPublished ? "Publicado en catálogo" : "Borrador (no visible)"}
          </label>
        </div>
      </div>

      <div className={cn(surfaceCard(), "flex min-h-[min(50vh,28rem)] flex-col gap-4 p-5 sm:p-6 lg:min-h-0")}>
        <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Espacios del circuito{" "}
            <span className="font-normal text-sm text-muted-foreground">
              ({selectedIds.size} seleccionados)
            </span>
          </h2>
          {selectedIds.size >= 2 && (
            <p className="text-xs text-muted-foreground">
              Total estimado:{" "}
              <span className="font-semibold text-foreground">
                $
                {Math.round(
                  units
                    .filter((u) => selectedIds.has(u.id))
                    .reduce((acc, u) => acc + Number(u.basePriceAmount), 0) / 1000,
                )}
                k/sem
              </span>
            </p>
          )}
        </div>
        {units.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No hay unidades en inventario.{" "}
            <a
              href="/admin/operaciones/inventory/new"
              className="text-led underline underline-offset-2"
            >
              Agregá una →
            </a>
          </p>
        ) : (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {units.map((u) => {
              const selected = selectedIds.has(u.id);
              const price = Number(u.basePriceAmount);
              const priceStr =
                price >= 1_000_000
                  ? `$${(price / 1_000_000).toFixed(1)}M`
                  : `$${Math.round(price / 1000)}k`;
              return (
                <label
                  key={u.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-all",
                    selected
                      ? "border-led/50 bg-led/8 shadow-[0_0_0_1px_rgba(0,182,199,0.2)]"
                      : "border-border bg-muted/30 hover:border-led/20 hover:bg-muted/60",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      selected ? "border-led bg-led text-black" : "border-border bg-card text-transparent",
                    )}
                  >
                    <svg
                      viewBox="0 0 10 8"
                      className="h-2.5 w-2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="1,4 3.5,6.5 9,1" />
                    </svg>
                  </div>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleUnit(u.id)}
                    className="sr-only"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.locationLabel}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-bold tabular-nums",
                      selected ? "text-led" : "text-muted-foreground",
                    )}
                  >
                    {priceStr}
                    <span className="font-normal">/sem</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p className="text-sm text-signal" role="alert">
            {error}
          </p>
        ) : (
          <span className="hidden sm:block" />
        )}
        <button
          className={cn(btnPrimary, "w-full sm:ml-auto sm:w-auto sm:min-w-[12rem]")}
          disabled={isPending}
          type="submit"
        >
          {isPending ? (isEdit ? "Guardando…" : "Creando…") : isEdit ? "Guardar cambios" : "Crear circuito"}
        </button>
      </div>
    </form>
  );
}
