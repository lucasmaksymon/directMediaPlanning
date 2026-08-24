"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  acceptReservationFromForm,
  rejectReservationFromForm,
} from "@/app/actions/reservation";
import { cn } from "@/lib/cn";

function SubmitButton({
  label,
  pendingLabel,
  variant,
  compact,
}: {
  label: string;
  pendingLabel: string;
  variant: "accept" | "reject";
  compact?: boolean;
}) {
  const { pending } = useFormStatus();
  const base = compact
    ? "rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition disabled:opacity-60"
    : "rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition disabled:opacity-60";
  const className =
    variant === "accept"
      ? cn(base, "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(0,182,199,0.3)] hover:opacity-90")
      : cn(base, "border border-border bg-card text-foreground hover:bg-muted");
  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AcceptForm({ reservationId, compact }: { reservationId: string; compact?: boolean }) {
  const [showNote, setShowNote] = useState(false);

  return (
    <form action={acceptReservationFromForm} className={cn("flex flex-col gap-1.5", compact ? "items-start" : "items-end")}>
      <input name="reservationId" type="hidden" value={reservationId} />
      <div className="flex flex-wrap gap-1.5">
        {!compact && (
          <button
            className="rounded-full border border-led/30 bg-led/10 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-led/20"
            onClick={() => setShowNote((v) => !v)}
            type="button"
          >
            {showNote ? "Ocultar nota" : "Agregar nota"}
          </button>
        )}
        <SubmitButton label={compact ? "Aceptar" : "Aceptar solicitud"} pendingLabel="…" variant="accept" compact={compact} />
      </div>
      {showNote && (
        <textarea
          className="w-full rounded-xl border border-border bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          name="providerNote"
          placeholder="Nota para el anunciante…"
          rows={2}
        />
      )}
    </form>
  );
}

export function RejectForm({ reservationId, compact }: { reservationId: string; compact?: boolean }) {
  const [showNote, setShowNote] = useState(false);

  return (
    <form action={rejectReservationFromForm} className={cn("flex flex-col gap-1.5", compact ? "items-start" : "items-end")}>
      <input name="reservationId" type="hidden" value={reservationId} />
      <div className="flex flex-wrap gap-1.5">
        {!compact && (
          <button
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
            onClick={() => setShowNote((v) => !v)}
            type="button"
          >
            {showNote ? "Ocultar nota" : "Agregar nota"}
          </button>
        )}
        <SubmitButton label="Rechazar" pendingLabel="…" variant="reject" compact={compact} />
      </div>
      {showNote && (
        <textarea
          className="w-full rounded-xl border border-border bg-[var(--input-bg)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          name="providerNote"
          placeholder="Motivo del rechazo…"
          rows={2}
        />
      )}
    </form>
  );
}
