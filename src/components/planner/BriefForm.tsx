"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { btnPrimary, fieldClass, labelClass } from "@/lib/ui-classes";
import type { PlannerBrief } from "@/app/actions/planner";

type Props = {
  onSubmit: (brief: PlannerBrief) => void;
  pending: boolean;
};

export function BriefForm({ onSubmit, pending }: Props) {
  const today = new Date().toISOString().split("T")[0]!;

  const [form, setForm] = useState<PlannerBrief>({
    objetivo: "",
    zona: "",
    presupuesto: 0,
    fechaInicio: today,
    fechaFin: "",
    audiencia: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass} htmlFor="objetivo">
          ¿Qué querés comunicar? <span className="text-led">*</span>
        </label>
        <textarea
          className={cn(fieldClass, "mt-1.5 min-h-[80px] resize-none")}
          id="objetivo"
          maxLength={400}
          onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
          placeholder="Ej. Lanzamiento de nueva línea de calzado premium, generar awareness en CABA"
          required
          value={form.objetivo}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="zona">
            Zona o mercado <span className="text-led">*</span>
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="zona"
            onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
            placeholder="Ej. CABA, Palermo, Córdoba"
            required
            type="text"
            value={form.zona}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="audiencia">
            Audiencia objetivo
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="audiencia"
            onChange={(e) => setForm((f) => ({ ...f, audiencia: e.target.value }))}
            placeholder="Ej. Jóvenes 18-35 años, familias, ejecutivos"
            type="text"
            value={form.audiencia ?? ""}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="presupuesto">
          Presupuesto total (ARS) <span className="text-led">*</span>
        </label>
        <input
          className={cn(fieldClass, "mt-1.5")}
          id="presupuesto"
          inputMode="decimal"
          min={1}
          onChange={(e) => setForm((f) => ({ ...f, presupuesto: Number(e.target.value) || 0 }))}
          placeholder="Ej. 500000"
          required
          step={1}
          type="number"
          value={form.presupuesto || ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="fechaInicio">
            Inicio de campaña <span className="text-led">*</span>
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="fechaInicio"
            min={today}
            onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
            required
            type="date"
            value={form.fechaInicio}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="fechaFin">
            Fin de campaña <span className="text-led">*</span>
          </label>
          <input
            className={cn(fieldClass, "mt-1.5")}
            id="fechaFin"
            min={form.fechaInicio || today}
            onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
            required
            type="date"
            value={form.fechaFin}
          />
        </div>
      </div>

      <button className={btnPrimary} disabled={pending} type="submit">
        {pending ? "Analizando espacios…" : "Generar plan con IA"}
      </button>
    </form>
  );
}
