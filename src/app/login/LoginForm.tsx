"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { fieldClass, labelClass, btnPrimary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

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
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/inicio",
    });
    setPending(false);
    if (result?.error) {
      setError("Revisá el email y la contraseña e intentá de nuevo.");
      return;
    }
    if (result?.url) {
      window.location.href = result.url;
    } else {
      window.location.href = "/inicio";
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {registered ? (
        <p className="rounded-2xl border border-led/40 bg-led/10 px-4 py-3 text-sm leading-relaxed text-foreground">
          Tu cuenta está lista. Iniciá sesión con el email y la contraseña que elegiste.
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className={cn(fieldClass, "mt-1.5")}
            id="email"
            name="email"
            required
            type="email"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="password">
            Contraseña
          </label>
          <input
            autoComplete="current-password"
            className={cn(fieldClass, "mt-1.5")}
            id="password"
            name="password"
            required
            type="password"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <button className={cn(btnPrimary, "w-full")} disabled={pending} type="submit">
          {pending ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
