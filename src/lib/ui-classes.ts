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

/** Select alineado al kit (chevron custom vía `.nm-select` en globals.css). */
export const selectClass = cn(fieldClass, "nm-select");

/** Select compacto para tablas y barras densas. */
export const selectClassCompact = cn(selectClass, "nm-select-compact");

export const labelClass = "text-sm font-medium text-foreground";

/** Botón primario — LED Cyan, píldora, uppercase (kit Nextmedia). */
export const btnPrimary =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-primary px-7 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition duration-250 ease-out hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(0,182,199,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

/** Botón secundario — borde cyan. */
export const btnSecondary =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-transparent px-7 text-sm font-bold uppercase tracking-wide text-foreground transition duration-250 hover:bg-primary/10";

/** Padding horizontal consistente para páginas a ancho completo. */
export const layoutPadding = "px-4 sm:px-6 lg:px-8 xl:px-10";

/** Contenedor de página (marketing / vistas públicas): usa todo el ancho útil. */
export const pageContainer = cn("w-full", layoutPadding);

/** Ancho máximo alineado en landings (hero + secciones). */
export const marketingContent = cn(layoutPadding, "mx-auto w-full max-w-7xl");

/** Texto introductorio bajo títulos. */
export const proseMuted = "text-base leading-relaxed text-muted-foreground";

/** Panel con sidebar (admin / advertiser): llena el área bajo el header global. */
export const panelPage = cn(
  "flex min-h-0 flex-1 w-full flex-col gap-4 py-4",
  layoutPadding,
);

/** Página admin: llena el área bajo el header (sin calc duplicado). */
export const adminPage = panelPage;

/** Alias operaciones / formularios. */
export const adminOpsPage = panelPage;

export const advertiserPage = panelPage;

export const adminPageHeader = "shrink-0";

export const adminOpsPageHeader = adminPageHeader;

/** Scroll único bajo el header (home, explorar, auth). */
export const pageScroll =
  "nm-page-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain w-full";

/** Cuerpo con scroll interno solo cuando hace falta. */
export const adminPageBody = "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain";

/** Tablas con scroll horizontal: reserva espacio para la barra sin saltos. */
export const tableScroll = "overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]";

export const adminOpsPageBody = "min-h-0 flex-1 overflow-hidden";
