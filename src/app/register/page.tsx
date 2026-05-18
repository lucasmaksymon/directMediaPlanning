import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main
      className="mx-auto flex h-full w-full max-w-lg flex-col justify-center overflow-y-auto px-4 py-12 sm:px-6 lg:px-8"
      suppressHydrationWarning
    >
      <div className="mb-8" suppressHydrationWarning>
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground">
          Crear cuenta
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Elegí si representás a un medio o a una marca, y completá tus datos de acceso.
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
