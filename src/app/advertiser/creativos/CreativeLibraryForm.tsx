"use client";

import { useActionState } from "react";
import { saveCreativeAsset } from "@/app/actions/creatives";
import { fieldClass, labelClass, btnPrimary, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function CreativeLibraryForm() {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => saveCreativeAsset(formData),
    null,
  );

  return (
    <form action={action} className={cn(surfaceCard(), "p-5 space-y-4")}>
      <h2 className="font-semibold">Subir creativo</h2>
      <div>
        <label className={labelClass} htmlFor="name">Nombre</label>
        <input className={cn(fieldClass, "mt-1")} id="name" name="name" required type="text" />
      </div>
      <div>
        <label className={labelClass} htmlFor="fileUrl">URL del archivo (UploadThing u otro)</label>
        <input className={cn(fieldClass, "mt-1")} id="fileUrl" name="fileUrl" required type="url" placeholder="https://..." />
      </div>
      <div>
        <label className={labelClass} htmlFor="mimeType">Tipo MIME</label>
        <input className={cn(fieldClass, "mt-1")} id="mimeType" name="mimeType" placeholder="image/png" />
      </div>
      {state && !state.ok && <p className="text-sm text-signal">{state.error}</p>}
      {state?.ok && <p className="text-sm text-led">Creativo guardado.</p>}
      <button className={btnPrimary} disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
