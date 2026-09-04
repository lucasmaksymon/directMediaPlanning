import type { PresentationThemeMode } from "@/lib/presentations/theme";

export const BRAND_WORDMARK_PUBLIC_WHITE = "/brand/nextmedia-wordmark-white.png";
export const BRAND_WORDMARK_PUBLIC_INK = "/brand/nextmedia-wordmark-ink.png";
export const BRAND_LOGO_COLOR_PUBLIC = "/brand/nextmedia-logo-color.png";
export const BRAND_LOGO_COLOR_FILE = "nextmedia-logo-color.png";

/** Relación del wordmark recortado (836×142). */
export const BRAND_WORDMARK_ASPECT = 836 / 142;
/** Relación del logo color con letra (880×175). */
export const BRAND_LOGO_COLOR_ASPECT = 880 / 175;

export function brandWordmarkFileName(theme: PresentationThemeMode) {
  return theme === "dark" ? "nextmedia-wordmark-white.png" : "nextmedia-wordmark-ink.png";
}

export function brandWordmarkPublicSrc(theme: PresentationThemeMode) {
  return theme === "dark" ? BRAND_WORDMARK_PUBLIC_WHITE : BRAND_WORDMARK_PUBLIC_INK;
}
