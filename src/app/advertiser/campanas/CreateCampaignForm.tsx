"use client";

import { useActionState } from "react";
import { createCampaign } from "@/app/actions/campaign";
import { fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { Alert, Button } from "@/components/ui";

export function CreateCampaignForm() {
  const [state, action, pending] = useActionState(createCampaign, undefined);

  return (
    <form action={action} className={cn(surfaceCard(), "space-y-4 p-5")}>
      <h2 className="font-semibold">Nueva campaña</h2>
      <div>
        <label className={labelClass} htmlFor="name">Nombre</label>
        <input className={cn(fieldClass, "mt-1")} id="name" name="name" required type="text" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="budget">Presupuesto (ARS)</label>
          <input className={cn(fieldClass, "mt-1")} id="budget" min={0} name="budget" type="number" />
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
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Campaña creada.</Alert>}
      <Button disabled={pending} type="submit">
        {pending ? "Creando…" : "Crear campaña"}
      </Button>
    </form>
  );
}
