"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  acceptReservationFromForm,
  rejectReservationFromForm,
} from "@/app/actions/reservation";

function SubmitButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "accept" | "reject";
}) {
  const { pending } = useFormStatus();
  const className =
    variant === "accept"
      ? "rounded-full bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_20px_rgba(0,182,199,0.35)] transition hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(0,182,199,0.45)] disabled:opacity-60 disabled:hover:scale-100"
      : "rounded-full border-2 border-border bg-card px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-foreground shadow-sm transition hover:bg-muted disabled:opacity-60";
  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AcceptForm({ reservationId }: { reservationId: string }) {
  const [showNote, setShowNote] = useState(false);

  return (
    <form action={acceptReservationFromForm} className="flex flex-col items-end gap-2">
      <input name="reservationId" type="hidden" value={reservationId} />
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full border border-led/30 bg-led/10 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-led/20"
          onClick={() => setShowNote((v) => !v)}
          type="button"
        >
          {showNote ? "Ocultar nota" : "Agregar nota"}
        </button>
        <SubmitButton label="Aceptar solicitud" pendingLabel="Procesando…" variant="accept" />
      </div>
      {showNote && (
        <textarea
          className="w-full rounded-2xl border border-border bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-[rgba(0,182,199,0.15)]"
          name="providerNote"
          placeholder="Ej. Confirmado para la semana del 15. Coordinar artes con el equipo."
          rows={2}
        />
      )}
    </form>
  );
}

export function RejectForm({ reservationId }: { reservationId: string }) {
  const [showNote, setShowNote] = useState(false);

  return (
    <form action={rejectReservationFromForm} className="flex flex-col items-end gap-2">
      <input name="reservationId" type="hidden" value={reservationId} />
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
          onClick={() => setShowNote((v) => !v)}
          type="button"
        >
          {showNote ? "Ocultar nota" : "Agregar nota"}
        </button>
        <SubmitButton label="Rechazar" pendingLabel="Procesando…" variant="reject" />
      </div>
      {showNote && (
        <textarea
          className="w-full rounded-2xl border border-border bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-[rgba(0,182,199,0.15)]"
          name="providerNote"
          placeholder="Ej. Las fechas ya están ocupadas. Podemos hablar de otras semanas."
          rows={2}
        />
      )}
    </form>
  );
}
