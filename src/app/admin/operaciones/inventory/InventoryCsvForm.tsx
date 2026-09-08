"use client";

import { useActionState } from "react";
import { importInventoryCsv } from "@/app/actions/inventory";
import { btnPrimary, fieldClass } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function InventoryCsvForm() {
  const [state, action, pending] = useActionState(importInventoryCsv, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground" htmlFor="csv">
          Importar CSV
        </label>
        <input
          accept=".csv,text/csv"
          className={cn(fieldClass, "h-8 py-1 text-sm")}
          id="csv"
          name="file"
          required
          type="file"
        />
      </div>
      <button className={cn(btnPrimary, "h-8 px-3 text-xs")} disabled={pending} type="submit">
        {pending ? "Importando…" : "Importar"}
      </button>
      {state?.imported != null ? (
        <p className="text-xs text-led">{state.imported} unidades importadas</p>
      ) : null}
      {state?.error ? <p className="text-xs text-signal">{state.error}</p> : null}
      {state?.errors?.slice(0, 4).map((err) => (
        <p key={err} className="basis-full text-xs text-muted-foreground">
          {err}
        </p>
      ))}
    </form>
  );
}
