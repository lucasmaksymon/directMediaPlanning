"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Overlay";

export function RecuperarForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      {state?.ok ? (
        <Alert variant="success">Si el email está registrado, vas a recibir el enlace en unos minutos.</Alert>
      ) : null}
      {state?.error ? (
        <Alert role="alert" variant="error">
          {state.error}
        </Alert>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
