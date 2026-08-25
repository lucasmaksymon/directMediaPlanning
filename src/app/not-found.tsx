import Link from "next/link";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/lib/ui-variants";

export default function NotFound() {
  return (
    <main
      className={cn(
        pageScroll,
        "mx-auto flex max-w-lg flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-led">404</p>
      <h1 className="nm-page-title">Página no encontrada</h1>
      <p className="nm-secondary">
        El enlace no existe o ya no está disponible. Volvé al inicio o explorá el catálogo.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: "primary", size: "md" })} href="/">
          Ir al inicio
        </Link>
        <Link className={buttonVariants({ variant: "outline", size: "md" })} href="/explorar">
          Ver catálogo
        </Link>
      </div>
    </main>
  );
}
