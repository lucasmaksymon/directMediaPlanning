"use client";

import { useActionState } from "react";
import { createScreen } from "@/app/actions/cms";
import { fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { Alert, Button } from "@/components/ui";

export function CmsScreenForm({ providerId: _providerId }: { providerId: string }) {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => createScreen(formData),
    null,
  );

  return (
    <form action={action} className={cn(surfaceCard(), "space-y-4 p-5")}>
      <h2 className="font-semibold">Registrar pantalla</h2>
      <div>
        <label className={labelClass} htmlFor="name">Nombre</label>
        <input className={cn(fieldClass, "mt-1")} id="name" name="name" required type="text" />
      </div>
      <div>
        <label className={labelClass} htmlFor="platform">Plataforma</label>
        <select className={cn(fieldClass, "mt-1")} defaultValue="web" id="platform" name="platform">
          <option value="web">Web</option>
          <option value="android">Android</option>
          <option value="tizen">Tizen</option>
          <option value="other">Otra</option>
        </select>
      </div>
      {state?.ok && state.deviceKey && (
        <Alert variant="success">
          Pantalla creada. Device key: <code className="font-mono">{state.deviceKey}</code>
        </Alert>
      )}
      {state && !state.ok && <Alert variant="error">{state.error}</Alert>}
      <Button disabled={pending} type="submit">
        {pending ? "Creando…" : "Crear pantalla"}
      </Button>
    </form>
  );
}
