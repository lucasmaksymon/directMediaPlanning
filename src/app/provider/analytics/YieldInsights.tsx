"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";

export function YieldInsights() {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/yield-insights")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.insights)) setInsights(d.insights);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={cn(surfaceCard(), "p-5 sm:p-6")}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">✦</span>
        <h2 className="text-base font-semibold text-foreground">Recomendaciones IA</h2>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-5 w-5 shrink-0 rounded-full bg-muted" />
              <div className="h-4 flex-1 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : insights.length > 0 ? (
        <ul className="space-y-3">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-led/15 text-xs font-bold text-led">
                {i + 1}
              </span>
              <span className="text-foreground leading-relaxed">{insight}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Configurá OPENAI_API_KEY para ver recomendaciones.</p>
      )}
    </div>
  );
}
