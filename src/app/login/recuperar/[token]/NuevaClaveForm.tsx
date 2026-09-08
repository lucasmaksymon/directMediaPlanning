"use client";

import { useActionState } from "react";
import { completePasswordReset } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Overlay";

export function NuevaClaveForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completePasswordReset.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Repetir contraseña</Label>
        <Input autoComplete="new-password" id="confirm" minLength={8} name="confirm" required type="password" />
      </div>
      {state?.ok ? (
        <Alert variant="success">Listo. Ya podés iniciar sesión con la nueva contraseña.</Alert>
      ) : null}
      {state?.error ? (
        <Alert role="alert" variant="error">
          {state.error}
        </Alert>
      ) : null}
      <Button className="w-full" disabled={pending || state?.ok} type="submit">
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
