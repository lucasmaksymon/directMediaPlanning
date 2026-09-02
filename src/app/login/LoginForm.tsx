"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Overlay";

export function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const rawCallback = searchParams.get("callbackUrl");
    const callbackUrl =
      rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
        ? rawCallback
        : "/inicio";
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setPending(false);
    if (result?.error) {
      setError("Revisá el email y la contraseña e intentá de nuevo.");
      return;
    }
    if (result?.url) {
      window.location.href = result.url;
    } else {
      window.location.href = callbackUrl;
    }
  }

  return (
    <div className="w-full space-y-6">
      {registered ? (
        <Alert variant="success">
          Tu cuenta está lista. Iniciá sesión con el email y la contraseña que elegiste.
        </Alert>
      ) : null}
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input autoComplete="email" id="email" name="email" required type="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            required
            type="password"
          />
        </div>
        {error ? (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        ) : null}
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </form>
    </div>
  );
}
