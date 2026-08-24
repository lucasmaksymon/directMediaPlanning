"use client";

import { useActionState } from "react";
import { createCampaign, type CampaignFormState } from "@/app/actions/campaign";
import { fieldClass, labelClass, btnPrimary, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function CreateCampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, undefined);

  return (
    <form action={action} className={cn(surfaceCard(), "p-5 space-y-4")}>
      <h2 className="font-semibold">Nueva campaña</h2>
      <div>
        <label className={labelClass} htmlFor="name">Nombre</label>
        <input className={cn(fieldClass, "mt-1")} id="name" name="name" required type="text" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="budget">Presupuesto (ARS)</label>
          <input className={cn(fieldClass, "mt-1")} id="budget" name="budget" type="number" min={0} />
        </div>
        <div>
          <label className={labelClass} htmlFor="startsAt">Inicio</label>
          <input className={cn(fieldClass, "mt-1")} id="startsAt" name="startsAt" type="date" />
        </div>
        <div>
          <label className={labelClass} htmlFor="endsAt">Fin</label>
          <input className={cn(fieldClass, "mt-1")} id="endsAt" name="endsAt" type="date" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-signal">{state.error}</p>}
      {state?.ok && <p className="text-sm text-led">Campaña creada.</p>}
      <button className={btnPrimary} disabled={pending} type="submit">
        {pending ? "Creando…" : "Crear campaña"}
      </button>
    </form>
  );
}
