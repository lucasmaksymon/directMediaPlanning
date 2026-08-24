import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
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
          Crear cuenta
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Registrate como cliente en {PRODUCT_NAME} para explorar el catálogo {CLIENT_BRAND} y enviar solicitudes.
        </p>
      </div>
      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <RegisterForm />
      </ClientOnly>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link className="font-semibold text-foreground underline underline-offset-2" href="/login">
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
