import Link from "next/link";
import { CLIENT_BRAND } from "@/lib/brand";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { NuevaClaveForm } from "./NuevaClaveForm";

export default async function NuevaClavePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className={cn(pageScroll, "mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:px-6")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-led">{CLIENT_BRAND}</p>
      <h1 className="nm-page-title mt-2">Nueva contraseña</h1>
      <p className="nm-secondary mt-3">Elegí una contraseña de al menos 8 caracteres.</p>
      <div className="mt-6">
        <NuevaClaveForm token={token} />
      </div>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link className="font-semibold text-foreground underline underline-offset-2" href="/login">
          Volver al login
        </Link>
      </p>
    </main>
  );
}
