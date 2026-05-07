import Link from "next/link";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main
      className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-lg flex-col justify-center px-4 py-12 sm:px-6 lg:px-8"
      suppressHydrationWarning
    >
      <div className="mb-8" suppressHydrationWarning>
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">
          Iniciar sesión
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Ingresá con el email y la contraseña de tu cuenta.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <ClientOnly fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
          <LoginForm />
        </ClientOnly>
      </Suspense>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link className="font-semibold text-foreground underline underline-offset-2" href="/register">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
