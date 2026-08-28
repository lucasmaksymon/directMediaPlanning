import { cn } from "@/lib/cn";
import { fieldBase, labelBase, buttonVariants, surfaceCardClass } from "@/lib/ui-variants";

/** Superficie tipo tarjeta — sin glow por defecto (DESIGN.md). */
export function surfaceCard(className?: string) {
  return surfaceCardClass(className);
}

/** Campos de formulario estándar. */
export const fieldClass = fieldBase;

/** Select alineado al kit. */
export const selectClass = cn(fieldClass, "nm-select");

/** Select compacto para tablas y barras densas. */
export const selectClassCompact = cn(selectClass, "nm-select-compact");

export const labelClass = labelBase;

/** Botón primario — producto (sentence case, radius md). */
export const btnPrimary = buttonVariants({ variant: "primary", size: "md" });

/** Botón secundario. */
export const btnSecondary = buttonVariants({ variant: "secondary", size: "md" });

/** CTAs marketing (uppercase pill) — home / landings. */
export const btnMarketing = buttonVariants({ variant: "marketing", size: "lg" });
export const btnMarketingSecondary = buttonVariants({
  variant: "marketing-secondary",
  size: "lg",
});

/** Padding horizontal consistente. */
export const layoutPadding = "px-4 sm:px-6 lg:px-8 xl:px-10";

export const pageContainer = cn("w-full", layoutPadding);

export const marketingContent = cn(layoutPadding, "mx-auto w-full max-w-7xl");

export const proseMuted = "nm-secondary";

export const panelPage = cn(
  "flex min-h-0 min-w-0 flex-1 w-full flex-col gap-5 overflow-x-hidden overflow-y-auto py-5",
  layoutPadding,
);

export const adminPage = panelPage;
export const adminOpsPage = panelPage;
export const advertiserPage = panelPage;

export const adminPageHeader = "shrink-0";
export const adminOpsPageHeader = adminPageHeader;

export const pageScroll =
  "nm-page-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain w-full";

export const adminPageBody =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain";

export const tableScroll = "overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]";

export const adminOpsPageBody = "min-h-0 flex-1 overflow-hidden";
