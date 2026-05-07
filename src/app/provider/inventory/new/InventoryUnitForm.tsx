"use client";

import type { ReactNode } from "react";
import { useActionState, useCallback, useEffect, useState } from "react";
import {
  createInventoryUnit,
  updateInventoryUnit,
  type ActionState,
} from "@/app/actions/inventory";
import { generateUnitDescription } from "@/app/actions/ai-inventory";
import { LocationMapPicker } from "@/components/inventory/LocationMapPicker";
import { cn } from "@/lib/cn";
import { btnPrimary, fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";

function parseCoord(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number.parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function FormSection({
  title,
  description,
  optional,
  children,
}: {
  title: string;
  description?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn(surfaceCard(), "p-5 sm:p-6")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1.5 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {optional ? (
          <span className="shrink-0 rounded-full border border-led/30 bg-led/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
            Opcional
          </span>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-led",
        className,
      )}
    />
  );
}

type UnitForEdit = {
  id: string;
  name: string;
  locationLabel: string;
  basePriceAmount: string;
  format: string;
  priceModel: string;
  status: string;
  minimalBookingGranularity: string;
  latitude: string | null;
  longitude: string | null;
  description?: string | null;
};

export function InventoryUnitForm({ unit }: { unit?: UnitForEdit }) {
  const isEdit = Boolean(unit);
  const [pinLat, setPinLat] = useState<number | null>(() => parseCoord(unit?.latitude ?? null));
  const [pinLng, setPinLng] = useState<number | null>(() => parseCoord(unit?.longitude ?? null));
  const [aiDescription, setAiDescription] = useState<string>(unit?.description ?? "");
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const setPin = useCallback((lat: number | null, lng: number | null) => {
    setPinLat(lat);
    setPinLng(lng);
  }, []);

  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (pinLat == null || pinLng == null) {
      setAddressLabel(null);
      setAddressError(null);
      setAddressLoading(false);
      return;
    }
    const ac = new AbortController();
    const timeout = window.setTimeout(() => {
      setAddressLoading(true);
      setAddressError(null);
      fetch(
        `/api/geocode/reverse?lat=${encodeURIComponent(String(pinLat))}&lng=${encodeURIComponent(String(pinLng))}`,
        { signal: ac.signal },
      )
        .then(async (r) => {
          const j: { label?: string; error?: string } = await r.json();
          if (!r.ok) {
            setAddressLabel(null);
            setAddressError(
              typeof j.error === "string" && j.error.trim()
                ? j.error
                : "No se pudo obtener la dirección.",
            );
            return;
          }
          if (typeof j.label === "string" && j.label.trim()) {
            setAddressLabel(j.label.trim());
            setAddressError(null);
          } else {
            setAddressLabel(null);
            setAddressError("Sin dirección para este punto.");
          }
        })
        .catch((e: Error) => {
          if (e.name === "AbortError") return;
          setAddressLabel(null);
          setAddressError("No se pudo obtener la dirección. Probá de nuevo.");
        })
        .finally(() => {
          if (!ac.signal.aborted) {
            setAddressLoading(false);
          }
        });
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      ac.abort();
    };
  }, [pinLat, pinLng]);

  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      if (unit) {
        return updateInventoryUnit(unit.id, prev, formData);
      }
      return createInventoryUnit(prev, formData);
    },
    undefined,
  );

  async function handleGenerateDescription(formEl: HTMLFormElement | null) {
    setAiPending(true);
    setAiError(null);
    const name = (formEl?.elements.namedItem("name") as HTMLInputElement)?.value ?? "";
    const locationLabel = (formEl?.elements.namedItem("locationLabel") as HTMLInputElement)?.value ?? "";
    const format = (formEl?.elements.namedItem("format") as HTMLSelectElement)?.value ?? "digital_ooh";
    const basePriceAmount = (formEl?.elements.namedItem("basePriceAmount") as HTMLInputElement)?.value ?? "0";
    const priceModel = (formEl?.elements.namedItem("priceModel") as HTMLSelectElement)?.value ?? "fixed_list";
    const res = await generateUnitDescription({ name, locationLabel, format, basePriceAmount, priceModel });
    if (res.ok) {
      setAiDescription(res.description);
    } else {
      setAiError(res.error);
    }
    setAiPending(false);
  }

  return (
    <form action={action} className="w-full max-w-4xl space-y-6">
      <FormSection
        description="Nombre comercial del espacio y zona que ves en cotizaciones y en el catálogo."
        title="Espacio y zona"
      >
        <div>
          <label className={labelClass} htmlFor="name">
            Nombre del espacio
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            defaultValue={unit?.name}
            id="name"
            name="name"
            placeholder="Ej. LED Av. Corrientes y Florida"
            required
            type="text"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="locationLabel">
            Ubicación o cobertura
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            defaultValue={unit?.locationLabel}
            id="locationLabel"
            name="locationLabel"
            placeholder="Ciudad, barrio o ruta"
            required
            type="text"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className={labelClass} htmlFor="description">
              Descripción comercial
            </label>
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-led/30 bg-led/10 px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-led/20 disabled:opacity-60"
              disabled={aiPending}
              onClick={(e) => handleGenerateDescription((e.currentTarget.closest("form") as HTMLFormElement) ?? null)}
              type="button"
            >
              {aiPending ? (
                <>
                  <InlineSpinner className="h-3 w-3" />
                  Generando…
                </>
              ) : (
                <>✦ Generar con IA</>
              )}
            </button>
          </div>
          <textarea
            className={cn(fieldClass, "mt-1.5 min-h-[100px] resize-none")}
            id="description"
            name="description"
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder="Ej. Pantalla LED de alto tráfico en el corazón de Palermo, ideal para marcas de moda y lifestyle que buscan impactar a un público joven y premium."
            value={aiDescription}
          />
          {aiError && (
            <p className="mt-1.5 text-xs text-signal" role="alert">
              {aiError}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Aparece en el catálogo público. Podés editarla libremente o generarla con IA.
          </p>
        </div>
      </FormSection>

      <FormSection
        description="Si marcás un punto, la unidad aparece en el mapa del catálogo público con dirección aproximada."
        optional
        title="Ubicación en el mapa"
      >
        <LocationMapPicker latitude={pinLat} longitude={pinLng} onChange={setPin} />
        <input name="latitude" type="hidden" value={pinLat != null ? String(pinLat) : ""} />
        <input name="longitude" type="hidden" value={pinLng != null ? String(pinLng) : ""} />

        {pinLat != null && pinLng != null && (
          <div className="space-y-3 rounded-2xl border border-border bg-muted/60 p-4 backdrop-blur-sm">
            {addressLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <InlineSpinner />
                <span>Buscando dirección…</span>
              </div>
            )}
            {!addressLoading && addressLabel && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dirección aproximada
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">{addressLabel}</p>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Datos © OpenStreetMap contributors (Nominatim)
                </p>
              </div>
            )}
            {!addressLoading && addressError && (
              <p className="text-sm text-signal" role="alert">
                {addressError}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <p className="font-mono text-xs text-muted-foreground">
                {pinLat.toFixed(6)}, {pinLng.toFixed(6)}
              </p>
              <button
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
                onClick={() => setPin(null, null)}
                type="button"
              >
                Quitar pin
              </button>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection
        description="Cómo cotizás el espacio y cómo lo ven los anunciantes en el catálogo."
        title="Precio y visibilidad"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="format">
              Tipo de espacio
            </label>
            <select
              className={cn(fieldClass, "mt-1.5")}
              defaultValue={unit?.format ?? "digital_ooh"}
              id="format"
              name="format"
              required
            >
              <option value="digital_ooh">Pantalla o digital OOH</option>
              <option value="static_ooh">OOH estático (valla, cartel)</option>
              <option value="digital_package">Paquete digital combinado</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="priceModel">
              Forma de cotización
            </label>
            <select
              className={cn(fieldClass, "mt-1.5")}
              defaultValue={unit?.priceModel ?? "fixed_list"}
              id="priceModel"
              name="priceModel"
              required
            >
              <option value="fixed_list">Precio de lista</option>
              <option value="negotiable">A convenir / negociable</option>
              <option value="package">Paquete cerrado</option>
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="basePriceAmount">
              Precio de referencia (ARS)
            </label>
            <input
              className={cn(fieldClass, "mt-1.5")}
              defaultValue={unit?.basePriceAmount}
              id="basePriceAmount"
              inputMode="decimal"
              name="basePriceAmount"
              placeholder="Ej. 150000"
              required
              step="0.01"
              type="number"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="minimalBookingGranularity">
              Reserva mínima por
            </label>
            <select
              className={cn(fieldClass, "mt-1.5")}
              defaultValue={unit?.minimalBookingGranularity ?? "week"}
              id="minimalBookingGranularity"
              name="minimalBookingGranularity"
              required
            >
              <option value="day">Día</option>
              <option value="week">Semana</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="status">
            Visibilidad en el catálogo
          </label>
          <select
            className={cn(fieldClass, "mt-1.5")}
            defaultValue={unit?.status ?? "draft"}
            id="status"
            name="status"
            required
          >
            <option value="draft">Borrador (no visible para el público)</option>
            <option value="published">Publicado (visible en el catálogo)</option>
            <option value="paused">Pausado (oculto temporalmente)</option>
          </select>
        </div>
      </FormSection>

      {state?.error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {isEdit
            ? "Los cambios se aplican al guardar. El catálogo refleja el estado publicado."
            : "Podés guardar en borrador y publicar cuando esté lista."}
        </p>
        <button
          className={cn(btnPrimary, "px-6")}
          disabled={pending}
          type="submit"
        >
          {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar unidad"}
        </button>
      </div>
    </form>
  );
}
