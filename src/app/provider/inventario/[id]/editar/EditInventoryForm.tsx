"use client";

import type { InventoryUnit } from "@prisma/client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProviderInventoryUnit, type InventoryUpsertState } from "@/app/actions/provider";
import { fieldClass, labelClass, btnPrimary, btnSecondary, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

const FORMAT_OPTIONS = [
  { value: "digital_ooh", label: "Pantalla digital (OOH)" },
  { value: "static_ooh", label: "Cartel estático / valla" },
  { value: "digital_package", label: "Paquete digital" },
];

export function EditInventoryForm({ unit }: { unit: InventoryUnit }) {
  const router = useRouter();
  const bound = updateProviderInventoryUnit.bind(null, unit.id);
  const [state, action, pending] = useActionState(
    async (prev: InventoryUpsertState, formData: FormData) => bound(prev, formData),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.push("/provider/inventario");
  }, [state?.ok, router]);

  return (
    <form action={action} className="space-y-6">
      <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-5")}>
        <div>
          <label className={labelClass} htmlFor="name">Nombre *</label>
          <input className={cn(fieldClass, "mt-1.5")} id="name" name="name" defaultValue={unit.name} required type="text" />
        </div>
        <div>
          <label className={labelClass} htmlFor="format">Formato *</label>
          <select className={cn(fieldClass, "mt-1.5")} id="format" name="format" defaultValue={unit.format} required>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="locationLabel">Ubicación *</label>
          <input className={cn(fieldClass, "mt-1.5")} id="locationLabel" name="locationLabel" defaultValue={unit.locationLabel} required type="text" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="latitude">Latitud</label>
            <input className={cn(fieldClass, "mt-1.5")} id="latitude" name="latitude" defaultValue={unit.latitude ?? ""} step="any" type="number" />
          </div>
          <div>
            <label className={labelClass} htmlFor="longitude">Longitud</label>
            <input className={cn(fieldClass, "mt-1.5")} id="longitude" name="longitude" defaultValue={unit.longitude ?? ""} step="any" type="number" />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="description">Descripción</label>
          <textarea className={cn(fieldClass, "mt-1.5 min-h-[80px]")} id="description" name="description" defaultValue={unit.description ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="basePriceAmount">Precio directo (ARS) *</label>
            <input className={cn(fieldClass, "mt-1.5")} id="basePriceAmount" name="basePriceAmount" defaultValue={Number(unit.basePriceAmount)} min={1} required type="number" />
          </div>
          <div>
            <label className={labelClass} htmlFor="agencyPriceAmount">Precio agencia (ARS)</label>
            <input className={cn(fieldClass, "mt-1.5")} id="agencyPriceAmount" name="agencyPriceAmount" defaultValue={unit.agencyPriceAmount ? Number(unit.agencyPriceAmount) : ""} type="number" />
          </div>
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="instantBookEnabled" defaultChecked={unit.instantBookEnabled} className="accent-led" />
          <span className="text-sm">Confirmación inmediata</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="lastMinuteEnabled" defaultChecked={unit.lastMinuteEnabled} className="accent-led" />
          <span className="text-sm">Last Minute</span>
        </label>
        <div>
          <label className={labelClass} htmlFor="lastMinuteDiscountPercent">Descuento Last Minute (%)</label>
          <input className={cn(fieldClass, "mt-1.5")} id="lastMinuteDiscountPercent" name="lastMinuteDiscountPercent" defaultValue={unit.lastMinuteDiscountPercent} type="number" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-signal">{state.error}</p>}
      <div className="flex gap-3">
        <button className={cn(btnPrimary, "flex-1")} disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar cambios"}</button>
        <a href="/provider/inventario" className={cn(btnSecondary, "flex-1 text-center")}>Cancelar</a>
      </div>
    </form>
  );
}
