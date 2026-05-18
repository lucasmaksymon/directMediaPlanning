"use client";

import { useState, useTransition } from "react";
import { SlotState } from "@prisma/client";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { createAvailabilityBlock, deleteAvailabilityBlock, type CalendarBlock } from "@/app/actions/availability";
import { cn } from "@/lib/cn";
import { btnPrimary, fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";

export function DisponibilidadClient({ unitId, initialBlocks }: { unitId: string; initialBlocks: CalendarBlock[] }) {
  const [blocks, setBlocks] = useState<CalendarBlock[]>(initialBlocks);
  const [isPending, startTransition] = useTransition();
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [state, setState] = useState<SlotState>(SlotState.available);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!startsAt || !endsAt) { setError("Seleccioná ambas fechas."); return; }
    setError(null);
    startTransition(async () => {
      const res = await createAvailabilityBlock(unitId, new Date(startsAt), new Date(endsAt), state);
      if (!res.ok) { setError(res.error ?? "Error."); return; }
      const newBlock: CalendarBlock = {
        id: Date.now().toString(),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        state,
        source: "availability",
      };
      setBlocks((prev) => [...prev, newBlock]);
      setStartsAt(""); setEndsAt("");
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteAvailabilityBlock(id);
      if (res.ok) setBlocks((prev) => prev.filter((b) => b.id !== id));
      else setError(res.error ?? "Error al eliminar.");
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* Calendario */}
      <div className={cn(surfaceCard(), "p-5 sm:p-6")}>
        <h2 className="mb-4 text-base font-semibold text-foreground">Calendario del espacio</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Hacé clic en un bloque verde (disponible) para eliminarlo. Las reservas activas se muestran en azul y no pueden eliminarse desde aquí.
        </p>
        <AvailabilityCalendar blocks={blocks} onDeleteBlock={handleDelete} />
      </div>

      {/* Agregar bloque */}
      <div className={cn(surfaceCard(), "p-5 sm:p-6 h-fit")}>
        <h2 className="mb-4 text-base font-semibold text-foreground">Agregar bloque</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="startsAt">Desde</label>
            <input className={cn(fieldClass, "mt-1.5")} id="startsAt" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="endsAt">Hasta</label>
            <input className={cn(fieldClass, "mt-1.5")} id="endsAt" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="state">Tipo de bloque</label>
            <select className={cn(fieldClass, "mt-1.5")} id="state" value={state} onChange={(e) => setState(e.target.value as SlotState)}>
              <option value={SlotState.available}>Disponible</option>
              <option value={SlotState.blocked}>Bloqueado (mantenimiento / uso interno)</option>
            </select>
          </div>
          {error && <p className="text-sm text-signal" role="alert">{error}</p>}
          <button className={cn(btnPrimary, "w-full")} disabled={isPending} onClick={handleAdd} type="button">
            {isPending ? "Guardando…" : "Agregar bloque"}
          </button>
        </div>

        {/* Lista de bloques */}
        {blocks.filter((b) => b.source === "availability").length > 0 && (
          <div className="mt-6 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bloques de disponibilidad</p>
            {blocks.filter((b) => b.source === "availability").map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {b.startsAt.toLocaleDateString("es-AR")} — {b.endsAt.toLocaleDateString("es-AR")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{b.state === "available" ? "Disponible" : "Bloqueado"}</p>
                </div>
                <button
                  className="rounded-full px-2 py-1 text-xs text-signal hover:bg-signal/10 transition"
                  disabled={isPending}
                  onClick={() => handleDelete(b.id)}
                  type="button"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
