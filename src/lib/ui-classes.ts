import { cn } from "@/lib/cn";

/** Superficie tipo tarjeta (listas, filtros, paneles) — estilo Nextmedia. */
export function surfaceCard(className?: string) {
  return cn(
    "rounded-3xl border border-border bg-card text-card-foreground shadow-sm nm-glow",
    "dark:bg-gradient-to-b dark:from-ocean dark:to-[#071012]",
    className,
  );
}

/** Campos de formulario estándar. */
export const fieldClass =
  "w-full rounded-[var(--radius-input,14px)] border bg-[var(--input-bg)] px-[18px] py-3.5 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground border-[color:var(--input-border)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-[rgba(0,182,199,0.15)]";

export const labelClass = "text-sm font-medium text-foreground";

/** Botón primario — LED Cyan, píldora, uppercase (kit Nextmedia). */
export const btnPrimary =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-primary px-7 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition duration-250 ease-out hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(0,182,199,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

/** Botón secundario — borde cyan. */
export const btnSecondary =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-transparent px-7 text-sm font-bold uppercase tracking-wide text-foreground transition duration-250 hover:bg-primary/10";

/** Contenedor de página de marketing / auth. */
export const pageContainer = "mx-auto max-w-[1440px] px-4 sm:px-6";

/** Texto introductorio bajo títulos. */
export const proseMuted = "text-base leading-relaxed text-muted-foreground";
