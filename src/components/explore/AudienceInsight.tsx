"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";

type Insight = {
  pois: {
    transit: number;
    commerce: number;
    education: number;
    health: number;
    entertainment: number;
    total: number;
  };
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

  if (loading) {
    return (
      <div className={cn(surfaceCard(), "animate-pulse p-4")}>
        <p className="h-3 w-32 rounded bg-muted" />
        <p className="mt-3 h-8 w-24 rounded bg-muted" />
      </div>
    );
  }

  if (error || !data) return null;

  return (
    <div className={cn(surfaceCard(), "space-y-3 p-4")}>
      <h3 className="nm-card-title text-sm">Estimación de audiencia</h3>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-lg font-semibold tabular-nums text-led">
            {data.weeklyAudience.toLocaleString("es-AR")}
          </p>
          <p className="nm-caption">Pers. / sem.</p>
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            ${data.cpm.toLocaleString("es-AR")}
          </p>
          <p className="nm-caption">CPM ref.</p>
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{data.pois.total}</p>
          <p className="nm-caption">POIs 400m</p>
        </div>
      </div>

      {data.aiInsight ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{data.aiInsight}</p>
      ) : null}
    </div>
  );
}
