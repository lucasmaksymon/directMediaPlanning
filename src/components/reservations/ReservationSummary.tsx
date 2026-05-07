"use client";

import { useEffect, useState } from "react";

type Props = {
  reservationId: string;
};

export function ReservationSummary({ reservationId }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  async function load() {
    if (summary !== null) {
      setVisible((v) => !v);
      return;
    }
    setLoading(true);
    setVisible(true);
    try {
      const res = await fetch(`/api/ai/reservation-summary?id=${encodeURIComponent(reservationId)}`);
      const data: { summary?: string; error?: string } = await res.json();
      setSummary(data.summary ?? data.error ?? "Sin resumen disponible.");
    } catch {
      setSummary("No se pudo generar el resumen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSummary(null);
    setVisible(false);
    setLoading(false);
  }, [reservationId]);

  return (
    <div className="mt-2">
      <button
        className="inline-flex items-center gap-1.5 rounded-full border border-led/25 bg-led/10 px-2.5 py-0.5 text-xs font-semibold text-foreground transition hover:bg-led/20 disabled:opacity-60"
        disabled={loading}
        onClick={load}
        type="button"
      >
        {loading ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-border border-t-led" />
            Resumiendo…
          </>
        ) : (
          <>✦ {visible ? "Ocultar resumen IA" : "Resumen IA"}</>
        )}
      </button>

      {visible && summary && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-led">IA: </span>
          {summary}
        </p>
      )}
    </div>
  );
}
