"use client";

import { useState, useTransition } from "react";
import { providerAcceptReservation, providerRejectReservation } from "@/app/actions/provider";
import { fieldClass } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function ProviderReservationActions({ reservationId }: { reservationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    startTransition(async () => {
      const res = await providerAcceptReservation(reservationId, note || undefined);
      if (res.ok) setDone("accepted");
      else setError(res.error ?? "Error.");
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await providerRejectReservation(reservationId, note || undefined);
      if (res.ok) setDone("rejected");
      else setError(res.error ?? "Error.");
    });
  }

  if (done === "accepted") {
    return (
      <p className="text-sm font-semibold text-led">
        ✓ Solicitud aceptada
      </p>
    );
  }
  if (done === "rejected") {
    return (
      <p className="text-sm font-semibold text-signal">
        ✗ Solicitud rechazada
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`note-${reservationId}`}>
          Nota para el anunciante (opcional)
        </label>
        <input
          className={cn(fieldClass, "mt-1 text-sm py-2")}
          id={`note-${reservationId}`}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej. Confirmado para ese período, coordinar arte..."
          type="text"
          value={note}
        />
      </div>
      {error && <p className="text-xs text-signal">{error}</p>}
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-full bg-led/90 px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-led disabled:opacity-50"
          disabled={isPending}
          onClick={handleAccept}
          type="button"
        >
          {isPending ? "Procesando…" : "Aceptar"}
        </button>
        <button
          className="flex-1 rounded-full border border-signal/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-signal transition hover:bg-signal/10 disabled:opacity-50"
          disabled={isPending}
          onClick={handleReject}
          type="button"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
