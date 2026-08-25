"use client";

import { useActionState } from "react";
import { saveCreativeAsset } from "@/app/actions/creatives";
import { fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { Alert, Button } from "@/components/ui";

export function CreativeLibraryForm() {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => saveCreativeAsset(formData),
    null,
  );

  return (
    <form action={action} className={cn(surfaceCard(), "space-y-4 p-5")}>
      <h2 className="font-semibold">Subir creativo</h2>
      <div>
        <label className={labelClass} htmlFor="name">Nombre</label>
        <input className={cn(fieldClass, "mt-1")} id="name" name="name" required type="text" />
      </div>
      <div>
        <label className={labelClass} htmlFor="fileUrl">URL del archivo (UploadThing u otro)</label>
        <input
          className={cn(fieldClass, "mt-1")}
          id="fileUrl"
          name="fileUrl"
          placeholder="https://..."
          required
          type="url"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="mimeType">Tipo MIME</label>
        <input className={cn(fieldClass, "mt-1")} id="mimeType" name="mimeType" placeholder="image/png" />
      </div>
      {state && !state.ok && <Alert variant="error">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Creativo guardado.</Alert>}
      <Button disabled={pending} type="submit">
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
