import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { LoadingState } from "@/components/ui/Patterns";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
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
        <h1 className="nm-page-title mt-2">Crear cuenta</h1>
        <p className="nm-secondary mt-3">
          Registrate como cliente en {PRODUCT_NAME} para explorar el catálogo {CLIENT_BRAND} y
          enviar solicitudes.
        </p>
      </div>
      <ClientOnly fallback={<LoadingState />}>
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
