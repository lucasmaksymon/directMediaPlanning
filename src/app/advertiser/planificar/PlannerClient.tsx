"use client";

import { useState, useTransition } from "react";
import { BriefForm } from "@/components/planner/BriefForm";
import { RecommendationCard, type UnitDetail } from "@/components/planner/RecommendationCard";
import { getPlannerRecommendations, type PlannerBrief, type PlannerResult } from "@/app/actions/planner";
import { createBatchReservations } from "@/app/actions/reservation";
import { formatArs } from "@/lib/format";
import { btnPrimary, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

type Props = {
  unitDetails: UnitDetail[];
};

export function PlannerClient({ unitDetails }: Props) {
  const [step, setStep] = useState<"brief" | "results">("brief");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [reserving, setReserving] = useState(false);
  const [reserveOk, setReserveOk] = useState(false);
  const [currentBrief, setCurrentBrief] = useState<PlannerBrief | null>(null);

  const unitMap = new Map(unitDetails.map((u) => [u.id, u]));

  function toggleUnit(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBriefSubmit(brief: PlannerBrief) {
    setCurrentBrief(brief);
    startTransition(async () => {
      const res = await getPlannerRecommendations(brief);
      setResult(res);
      if (res.ok) {
        setSelected(new Set(res.recomendaciones.map((r) => r.unitId)));
      }
      setStep("results");
    });
  }

  async function handleReserveAll() {
    if (selected.size === 0 || !currentBrief) return;
    setReserving(true);
    try {
      const res = await createBatchReservations(
        Array.from(selected),
        currentBrief.fechaInicio,
        currentBrief.fechaFin,
      );
      if (res.ok) {
        setReserveOk(true);
      }
    } finally {
      setReserving(false);
    }
  }

  const totalEstimado = Array.from(selected).reduce((acc, id) => {
    const u = unitMap.get(id);
    return acc + (u ? Number(u.basePriceAmount) : 0);
  }, 0);

  const presupuestoMax = currentBrief?.presupuesto ?? 0;
  const budgetPct = presupuestoMax > 0 ? Math.min((totalEstimado / presupuestoMax) * 100, 100) : 0;
  const budgetOver = presupuestoMax > 0 && totalEstimado > presupuestoMax;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-4">
      {/* Paso 1: Brief */}
      {step === "brief" && (
        <div className={cn(surfaceCard(), "p-6 sm:p-8")}>
          <BriefForm onSubmit={handleBriefSubmit} pending={isPending} />
        </div>
      )}

      {/* Cargando */}
      {isPending && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-led" />
          Analizando {unitDetails.length} espacios disponibles con IA…
        </div>
      )}

      {/* Paso 2: Resultados */}
      {step === "results" && result && !isPending && (
        <div className="space-y-8">
          <button
            className="text-sm font-medium text-muted-foreground hover:text-led transition"
            onClick={() => { setStep("brief"); setResult(null); setReserveOk(false); }}
            type="button"
          >
            ← Volver al brief
          </button>

          {!result.ok ? (
            <div className="rounded-2xl border border-signal/40 bg-signal/10 px-5 py-4 text-sm text-foreground">
              {result.error}
            </div>
          ) : (
            <>
              {/* Resumen IA */}
              <div className="rounded-3xl border border-led/25 bg-led/5 p-5 nm-glow dark:bg-led/[0.06]">
                <p className="text-xs font-semibold uppercase tracking-wide text-led">Estrategia sugerida por IA</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{result.resumen}</p>
              </div>

              {/* Cards */}
              <div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Seleccioná los espacios que querés reservar. Podés deseleccionar los que no te interesan.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {result.recomendaciones.map((rec) => {
                    const u = unitMap.get(rec.unitId);
                    if (!u) return null;
                    return (
                      <RecommendationCard
                        key={rec.unitId}
                        justificacion={rec.justificacion}
                        onToggle={toggleUnit}
                        score={rec.score}
                        selected={selected.has(rec.unitId)}
                        unit={u}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Resumen de selección + acción */}
              {selected.size > 0 && !reserveOk && (
                <div className={cn(
                  "rounded-3xl border p-5 nm-glow dark:bg-gradient-to-b dark:from-ocean dark:to-[#071012]",
                  budgetOver
                    ? "border-signal/50 bg-signal/5"
                    : "border-border bg-card",
                )}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{selected.size}</span>{" "}
                        {selected.size === 1 ? "espacio seleccionado" : "espacios seleccionados"}
                      </p>
                      <p className={cn(
                        "mt-1 text-lg font-semibold tabular-nums",
                        budgetOver ? "text-signal" : "text-foreground",
                      )}>
                        Total estimado: {formatArs(totalEstimado)}
                      </p>
                      {presupuestoMax > 0 && (
                        <>
                          <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                budgetOver ? "bg-signal" : "bg-led",
                              )}
                              style={{ width: `${budgetPct}%` }}
                            />
                          </div>
                          <p className={cn("mt-1 text-xs", budgetOver ? "text-signal font-medium" : "text-muted-foreground")}>
                            {budgetOver
                              ? `Superás el presupuesto en ${formatArs(totalEstimado - presupuestoMax)}`
                              : `${formatArs(presupuestoMax - totalEstimado)} disponibles de ${formatArs(presupuestoMax)}`}
                          </p>
                        </>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Precios de referencia · sujeto a confirmación del medio
                      </p>
                    </div>
                    <button
                      className={cn(btnPrimary)}
                      disabled={reserving}
                      onClick={handleReserveAll}
                      type="button"
                    >
                      {reserving ? "Enviando solicitudes…" : `Solicitar ${selected.size} ${selected.size === 1 ? "espacio" : "espacios"}`}
                    </button>
                  </div>
                </div>
              )}

              {reserveOk && (
                <div className="rounded-2xl border border-led/40 bg-led/10 px-5 py-4 text-sm font-medium text-foreground nm-glow">
                  ¡Solicitudes enviadas! Los medios revisarán y responderán a cada pedido.{" "}
                  <a className="font-semibold text-led underline underline-offset-2" href="/advertiser">
                    Ver mis solicitudes →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
