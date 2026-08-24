"use client";

import { useState, useTransition } from "react";
import { initiatePayment } from "@/app/actions/payments";
import { btnPrimary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function PayReservationButton({ reservationId }: { reservationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const res = await initiatePayment(reservationId);
      if (!res.ok) {
        setError(res.error ?? "Error al iniciar pago.");
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (res.manualMode) setManual(true);
    });
  }

  if (manual) {
    return (
      <p className="text-sm text-muted-foreground">
        Pago pendiente de coordinación. El equipo te contactará para confirmar la transferencia.
      </p>
    );
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-signal">{error}</p>}
      <button className={cn(btnPrimary, "text-sm")} disabled={isPending} onClick={handlePay} type="button">
        {isPending ? "Procesando…" : "Pagar reserva"}
      </button>
    </div>
  );
}
