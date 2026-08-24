"use client";

import { useActionState } from "react";
import { createCircuitReservation, type CircuitReservationState } from "@/app/actions/circuit-reservation";
import { fieldClass, labelClass, btnPrimary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function CircuitReserveForm({ circuitId }: { circuitId: string }) {
  const bound = createCircuitReservation.bind(null, circuitId);
  const [state, action, pending] = useActionState(
    async (prev: CircuitReservationState, formData: FormData) => bound(prev, formData),
    undefined,
  );

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold text-foreground">Reservar circuito completo</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`starts-${circuitId}`}>Desde</label>
          <input className={cn(fieldClass, "mt-1")} id={`starts-${circuitId}`} name="startsAt" required type="date" />
        </div>
        <div>
          <label className={labelClass} htmlFor={`ends-${circuitId}`}>Hasta</label>
          <input className={cn(fieldClass, "mt-1")} id={`ends-${circuitId}`} name="endsAt" required type="date" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-signal">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-led">Solicitud enviada para {state.created} espacio(s).</p>
      )}
      <button className={btnPrimary} disabled={pending || state?.ok} type="submit">
        {pending ? "Enviando…" : "Solicitar reserva del circuito"}
      </button>
    </form>
  );
}
