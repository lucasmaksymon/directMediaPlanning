"use client";

import { useActionState } from "react";
import { createProviderInventoryUnit, type InventoryUpsertState } from "@/app/actions/provider";
import { fieldClass, labelClass, btnPrimary, btnSecondary, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FORMAT_OPTIONS = [
  { value: "digital_ooh", label: "Pantalla digital (OOH)" },
  { value: "static_ooh", label: "Cartel estático / valla" },
  { value: "digital_package", label: "Paquete digital" },
];

export function NewInventoryForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (prev: InventoryUpsertState, formData: FormData) =>
      createProviderInventoryUnit(prev, formData),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      setTimeout(() => router.push("/provider/inventario"), 800);
    }
  }, [state?.ok, router]);

  return (
    <form action={action} className="space-y-6">
      {/* Información básica */}
      <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-5")}>
        <h2 className="text-base font-semibold text-foreground">Información del espacio</h2>

        <div>
          <label className={labelClass} htmlFor="name">
            Nombre del espacio *
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="name"
            name="name"
            placeholder="Ej. Pantalla LED Av. Corrientes 1200"
            required
            type="text"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="format">
            Tipo de formato *
          </label>
          <select className={cn(fieldClass, "mt-1.5")} id="format" name="format" required>
            <option value="">Seleccioná un formato</option>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="locationLabel">
            Dirección o descripción de ubicación *
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="locationLabel"
            name="locationLabel"
            placeholder="Ej. Av. Corrientes 1200, CABA, frente al Teatro"
            required
            type="text"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Esta descripción aparecerá en el catálogo para los anunciantes.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="latitude">
              Latitud (opcional)
            </label>
            <input
              className={cn(fieldClass, "mt-1.5")}
              id="latitude"
              name="latitude"
              placeholder="-34.6037"
              step="any"
              type="number"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="longitude">
              Longitud (opcional)
            </label>
            <input
              className={cn(fieldClass, "mt-1.5")}
              id="longitude"
              name="longitude"
              placeholder="-58.3816"
              step="any"
              type="number"
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="description">
            Descripción adicional
          </label>
          <textarea
            className={cn(fieldClass, "mt-1.5 min-h-[80px] resize-none")}
            id="description"
            maxLength={600}
            name="description"
            placeholder="Medidas, características técnicas, flujo vehicular, etc."
          />
        </div>
      </div>

      {/* Precios */}
      <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-5")}>
        <div>
          <h2 className="text-base font-semibold text-foreground">Precios</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            El precio directo es lo que paga un anunciante al contactarte sin intermediaria.
            El precio para agencias es el precio preferencial que ofrece la plataforma a través de agencias
            (menor al directo). La diferencia es la comisión de la agencia.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="basePriceAmount">
              Precio directo (ARS) *
            </label>
            <input
              className={cn(fieldClass, "mt-1.5")}
              id="basePriceAmount"
              inputMode="decimal"
              min={1}
              name="basePriceAmount"
              placeholder="Ej. 250000"
              required
              step={1}
              type="number"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="agencyPriceAmount">
              Precio para agencias (ARS)
            </label>
            <input
              className={cn(fieldClass, "mt-1.5")}
              id="agencyPriceAmount"
              inputMode="decimal"
              min={1}
              name="agencyPriceAmount"
              placeholder="Ej. 200000 (menor al directo)"
              step={1}
              type="number"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Dejá vacío para usar el mismo precio directo.
            </p>
          </div>
        </div>
      </div>

      {/* Opciones adicionales */}
      <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-4")}>
        <h2 className="text-base font-semibold text-foreground">Opciones adicionales</h2>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            className="h-4 w-4 rounded border-border accent-led"
            id="instantBookEnabled"
            name="instantBookEnabled"
            type="checkbox"
          />
          <div>
            <span className="text-sm font-medium text-foreground">Confirmación inmediata</span>
            <p className="text-xs text-muted-foreground">
              Las solicitudes se confirman automáticamente sin requerir tu aprobación manual.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            className="h-4 w-4 rounded border-border accent-led"
            id="lastMinuteEnabled"
            name="lastMinuteEnabled"
            type="checkbox"
          />
          <div>
            <span className="text-sm font-medium text-foreground">Last Minute</span>
            <p className="text-xs text-muted-foreground">
              Aparece en la sección Last Minute con descuento automático para fechas próximas.
            </p>
          </div>
        </label>

        <div>
          <label className={labelClass} htmlFor="lastMinuteDiscountPercent">
            Descuento Last Minute (%)
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            defaultValue={20}
            id="lastMinuteDiscountPercent"
            max={80}
            min={5}
            name="lastMinuteDiscountPercent"
            type="number"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm font-medium text-led" role="status">
          ¡Espacio creado! Redirigiendo a tu inventario…
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className={cn(btnPrimary, "flex-1")} disabled={pending || state?.ok} type="submit">
          {pending ? "Guardando…" : "Guardar espacio"}
        </button>
        <a href="/provider/inventario" className={cn(btnSecondary, "flex-1 text-center")}>
          Cancelar
        </a>
      </div>
    </form>
  );
}
