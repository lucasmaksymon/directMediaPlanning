import Link from "next/link";
import { surfaceCard, btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export default function HomePage() {
  return (
    <main
      className="w-full px-4 py-12 sm:px-6 lg:px-8 xl:px-10 lg:py-16 xl:py-20"
      suppressHydrationWarning
    >
      <div className="max-w-5xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-led">Nextmedia</p>
        <h1 className="font-display mt-4 text-4xl font-normal uppercase leading-[1.05] tracking-wide text-foreground sm:text-5xl md:text-6xl">
          Medios publicitarios, transparentes y en un solo lugar
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Conectamos marcas con espacios en vía pública y digital. Descubrís ubicaciones, pedís
          disponibilidad y seguís cada solicitud. El cierre comercial y el pago los coordinás con el
          medio: simple, claro y sin sorpresas.
        </p>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        <section className={cn(surfaceCard(), "p-8 lg:p-10")}>
          <h2 className="text-lg font-semibold text-foreground">Soy un medio</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Subí tus pantallas, vallas o paquetes, definí precios de referencia y respondé los pedidos
            que llegan. Seguimiento comercial e inventario en un panel pensado para equipos que
            escalan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={btnPrimary} href="/register">
              Registrar mi medio
            </Link>
            <Link className={cn(btnSecondary, "inline-flex items-center")} href="/provider">
              Ir al panel
            </Link>
          </div>
        </section>
        <section className={cn(surfaceCard(), "p-8 lg:p-10")}>
          <h2 className="text-lg font-semibold text-foreground">Soy anunciante</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Recorré el catálogo por zona y formato, solicitá fechas y mantené el historial de pedidos.
            Ideal para marketing y pymes que compran con visibilidad.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={btnPrimary} href="/explorar">
              Ver catálogo
            </Link>
            <Link className={cn(btnSecondary, "inline-flex items-center")} href="/register">
              Crear cuenta
            </Link>
          </div>
        </section>
      </div>

      <p className="mt-16 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link className="font-semibold text-foreground underline underline-offset-4" href="/login">
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
