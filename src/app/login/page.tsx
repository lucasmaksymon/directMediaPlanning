import Link from "next/link";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main
      className={cn(
        pageScroll,
        "mx-auto flex max-w-lg flex-col justify-center px-4 py-12 sm:px-6 lg:px-8",
      )}
      suppressHydrationWarning
    >
      <div className="mb-8" suppressHydrationWarning>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">{CLIENT_BRAND}</p>
        <h1 className="font-display mt-2 text-3xl font-normal uppercase tracking-wide text-foreground">
          Iniciar sesión
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Accedé a tu cuenta de {PRODUCT_NAME} con email y contraseña.
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
