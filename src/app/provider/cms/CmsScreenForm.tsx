"use client";

import { useActionState } from "react";
import { createScreen } from "@/app/actions/cms";
import { fieldClass, labelClass, btnPrimary, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function CmsScreenForm({ providerId: _providerId }: { providerId: string }) {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => createScreen(formData),
    null,
  );

  return (
    <form action={action} className={cn(surfaceCard(), "p-5 space-y-4")}>
      <h2 className="font-semibold">Registrar pantalla</h2>
      <div>
        <label className={labelClass} htmlFor="name">Nombre</label>
        <input className={cn(fieldClass, "mt-1")} id="name" name="name" required type="text" />
      </div>
      <div>
        <label className={labelClass} htmlFor="platform">Plataforma</label>
        <select className={cn(fieldClass, "mt-1")} id="platform" name="platform" defaultValue="web">
          <option value="web">Web</option>
          <option value="android">Android</option>
          <option value="tizen">Tizen</option>
          <option value="other">Otra</option>
        </select>
      </div>
      {state?.ok && state.deviceKey && (
        <p className="text-sm text-led">Pantalla creada. Device key: <code className="font-mono">{state.deviceKey}</code></p>
      )}
      {state && !state.ok && <p className="text-sm text-signal">{state.error}</p>}
      <button className={btnPrimary} disabled={pending} type="submit">{pending ? "Creando…" : "Crear pantalla"}</button>
    </form>
  );
}
