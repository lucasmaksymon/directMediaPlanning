"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";

type Insight = {
  pois: { transit: number; commerce: number; education: number; health: number; entertainment: number; total: number };
  weeklyAudience: number;
  cpm: number;
  aiInsight: string;
};

export function AudienceInsight({ unitId }: { unitId: string }) {
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ai/audience?unitId=${unitId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("No disponible"))
      .finally(() => setLoading(false));
  }, [unitId]);

  if (loading) return (
    <div className={cn(surfaceCard(), "p-6 animate-pulse")}>
      <p className="h-4 w-40 rounded bg-muted" />
      <p className="mt-3 h-3 w-full rounded bg-muted" />
    </div>
  );

  if (error || !data) return null;

  return (
    <div className={cn(surfaceCard(), "p-6 space-y-5")}>
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h3 className="font-semibold text-foreground">Estimación de audiencia</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold text-led tabular-nums">
            {data.weeklyAudience.toLocaleString("es-AR")}
          </p>
          <p className="text-xs text-muted-foreground">Personas / semana (est.)</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            ${data.cpm.toLocaleString("es-AR")}
          </p>
          <p className="text-xs text-muted-foreground">CPM referencial</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{data.pois.total}</p>
          <p className="text-xs text-muted-foreground">POIs en 400m</p>
        </div>
      </div>

      {/* POIs breakdown */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Transporte", value: data.pois.transit, emoji: "🚌" },
          { label: "Comercios", value: data.pois.commerce, emoji: "🛍️" },
          { label: "Educación", value: data.pois.education, emoji: "🎓" },
          { label: "Salud", value: data.pois.health, emoji: "🏥" },
          { label: "Ocio", value: data.pois.entertainment, emoji: "🎭" },
        ].filter((p) => p.value > 0).map((p) => (
          <span key={p.label} className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
            {p.emoji} {p.label}: {p.value}
          </span>
        ))}
      </div>

      {data.aiInsight && (
        <div className="rounded-xl border border-led/20 bg-led/5 p-4">
          <p className="text-sm leading-relaxed text-foreground">{data.aiInsight}</p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Datos basados en OpenStreetMap. Estimaciones orientativas. Datos © OpenStreetMap contributors.
      </p>
    </div>
  );
}
