import Link from "next/link";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { RecuperarForm } from "./RecuperarForm";

export default function RecuperarPage() {
  return (
    <main className={cn(pageScroll, "mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:px-6")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-led">{CLIENT_BRAND}</p>
      <h1 className="nm-page-title mt-2">Recuperar contraseña</h1>
      <p className="nm-secondary mt-3">
        Ingresá el email de tu cuenta de {PRODUCT_NAME}. Si existe, te mandamos un enlace.
      </p>
      <div className="mt-6">
        <RecuperarForm />
      </div>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link className="font-semibold text-foreground underline underline-offset-2" href="/login">
          Volver al login
        </Link>
      </p>
    </main>
  );
}
