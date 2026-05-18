"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Suggestion = {
  suggestedPrice: number;
  confidence: string;
  reasoning: string;
  delta: string;
};

type Props = {
  locationLabel: string;
  format: string;
  basePriceAmount: string;
};

export function PriceSuggestion({ locationLabel, format, basePriceAmount }: Props) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!locationLabel || !format || !basePriceAmount || Number(basePriceAmount) <= 0) {
      setSuggestion(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/price-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationLabel, format, basePriceAmount }),
        });
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        setSuggestion(data);
      } catch {
        setError("No se pudo obtener sugerencia.");
      } finally {
        setLoading(false);
      }
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [locationLabel, format, basePriceAmount]);

  if (!locationLabel || !format || !basePriceAmount) return null;

  return (
    <div className={cn(
      "mt-2 rounded-xl border px-3 py-2.5 text-xs transition-all",
      loading ? "border-border bg-muted/40 animate-pulse" : suggestion ? "border-led/30 bg-led/5" : "border-border bg-transparent",
    )}>
      {loading && <p className="text-muted-foreground">✦ Analizando precios del mercado…</p>}
      {error && <p className="text-signal">{error}</p>}
      {suggestion && !loading && (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            ✦ IA sugiere: <span className="text-led">${suggestion.suggestedPrice.toLocaleString("es-AR")}</span>
            {" "}<span className={cn("text-xs", suggestion.delta.startsWith("+") ? "text-green-600 dark:text-green-400" : "text-signal")}>
              ({suggestion.delta})
            </span>
          </p>
          <p className="text-muted-foreground">{suggestion.reasoning}</p>
          <p className="text-[11px] text-muted-foreground">Confianza: {suggestion.confidence}</p>
        </div>
      )}
    </div>
  );
}
