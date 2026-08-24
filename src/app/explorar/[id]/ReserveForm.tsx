"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  createReservation,
  type ReservationState,
} from "@/app/actions/reservation";
import { btnPrimary, fieldClass, labelClass } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function ReserveForm({
  unitId,
  isAdvertiser,
  isViaAgency = false,
  agencyId = null,
}: {
  unitId: string;
  isAdvertiser: boolean;
  isViaAgency?: boolean;
  agencyId?: string | null;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ReservationState, formData: FormData) =>
      createReservation(unitId, prev, formData),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      const t = window.setTimeout(() => {
        window.location.href = "/advertiser";
      }, 800);
      return () => window.clearTimeout(t);
    }
  }, [state?.ok]);

  if (!isAdvertiser) {
    return (
      <div className="rounded-2xl border border-signal/40 bg-signal/10 px-4 py-4 text-sm leading-relaxed text-foreground">
        <p>
          Para enviar una solicitud necesitás una cuenta de{" "}
          <strong>anunciante</strong>.{" "}
          <Link className="font-semibold underline underline-offset-2" href="/register">
            Creá tu cuenta
          </Link>{" "}
          o{" "}
          <Link className="font-semibold underline underline-offset-2" href="/login">
            iniciá sesión
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {/* Campos ocultos para contexto de precio */}
      {isViaAgency && agencyId && (
        <>
          <input type="hidden" name="priceType" value="agency" />
          <input type="hidden" name="agencyId" value={agencyId} />
        </>
      )}
      {!isViaAgency && <input type="hidden" name="priceType" value="direct" />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="startsAt">
            Fecha de inicio
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="startsAt"
            name="startsAt"
            required
            type="date"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="endsAt">
            Fecha de fin
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="endsAt"
            name="endsAt"
            required
            type="date"
          />
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {isViaAgency
          ? "La solicitud se procesará a través de tu agencia al precio especial acordado."
          : "El medio confirmará disponibilidad y condiciones. El pago se coordina con NextMedia."}
      </p>
      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm font-medium text-led" role="status">
          Solicitud enviada. Te llevamos a tu listado…
        </p>
      ) : null}
      <button className={btnPrimary} disabled={pending || state?.ok} type="submit">
        {pending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
