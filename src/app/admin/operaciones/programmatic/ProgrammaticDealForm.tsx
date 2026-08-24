"use client";

import { useActionState } from "react";
import { upsertProgrammaticDeal } from "@/app/actions/programmatic";
import { fieldClass, labelClass, btnPrimary, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function ProgrammaticDealForm({ units }: { units: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const unitId = String(formData.get("unitId") ?? "");
      if (!unitId) return { ok: false, error: "Seleccioná una unidad." };
      return upsertProgrammaticDeal(unitId, formData);
    },
    null,
  );

  return (
    <form action={action} className={cn(surfaceCard(), "p-5 space-y-4")}>
      <h2 className="font-semibold">Nuevo deal SSP</h2>
      <div>
        <label className={labelClass} htmlFor="unitId">Unidad</label>
        <select className={cn(fieldClass, "mt-1")} id="unitId" name="unitId" required>
          <option value="">Seleccionar…</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="dealType">Tipo</label>
          <select className={cn(fieldClass, "mt-1")} id="dealType" name="dealType" defaultValue="open">
            <option value="open">Open RTB</option>
            <option value="pmp">PMP</option>
            <option value="programmatic_guaranteed">Programmatic Guaranteed</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="floorPrice">Floor (ARS)</label>
          <input className={cn(fieldClass, "mt-1")} id="floorPrice" name="floorPrice" type="number" min={1} required />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="openRtbUnitId">OpenRTB Unit ID (opcional)</label>
        <input className={cn(fieldClass, "mt-1")} id="openRtbUnitId" name="openRtbUnitId" type="text" />
      </div>
      {state?.ok && <p className="text-sm text-led">Deal guardado.</p>}
      {state && !state.ok && <p className="text-sm text-signal">{state.error}</p>}
      <button className={btnPrimary} disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar deal"}</button>
    </form>
  );
}
