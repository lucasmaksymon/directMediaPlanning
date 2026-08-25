import Link from "next/link";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { LoadingState } from "@/components/ui/Patterns";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main
      className={cn(
        pageScroll,
        "mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:px-6",
      )}
      suppressHydrationWarning
    >
      <div className="mb-8" suppressHydrationWarning>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-led">
          {CLIENT_BRAND}
        </p>
        <h1 className="nm-page-title mt-2">Iniciar sesión</h1>
        <p className="nm-secondary mt-3">
          Accedé a tu cuenta de {PRODUCT_NAME} con email y contraseña.
        </p>
      </div>
      <Suspense fallback={<LoadingState />}>
        <ClientOnly fallback={<LoadingState />}>
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
