export type PresentationThemeMode = "light" | "dark";

/** Paleta alineada a globals.css (:root / .dark). */
export type PresentationPalette = {
  led: string;
  foreground: string;
  canvas: string;
  card: string;
  muted: string;
  border: string;
  ocean: string;
  surfaceSecondary: string;
  onDark: string;
  onDarkMuted: string;
};

const LIGHT: PresentationPalette = {
  led: "#00b6c7",
  foreground: "#071012",
  canvas: "#f7f9fa",
  card: "#ffffff",
  muted: "#5a6567",
  border: "#d5dbdd",
  ocean: "#081820",
  surfaceSecondary: "#eef2f3",
  onDark: "#f7f9fa",
  onDarkMuted: "rgba(247,249,250,0.66)",
};

const DARK: PresentationPalette = {
  led: "#00b6c7",
  foreground: "#f7f9fa",
  canvas: "#071012",
  card: "#081820",
  muted: "#a8b3b5",
  // Hex opaco (react-pdf malinterpreta rgba y puede pintar amarillo/lima)
  border: "#1a3a40",
  ocean: "#081820",
  surfaceSecondary: "#0c1a20",
  onDark: "#f7f9fa",
  onDarkMuted: "#a8b3b5",
};

export function getPresentationPalette(mode: PresentationThemeMode): PresentationPalette {
  return mode === "dark" ? DARK : LIGHT;
}

/** Hex sin # / alpha simplificado para pptxgenjs. */
export type PresentationPptxPalette = {
  led: string;
  foreground: string;
  canvas: string;
  card: string;
  muted: string;
  border: string;
  ocean: string;
  surfaceSecondary: string;
  onDark: string;
  onDarkMuted: string;
};

const LIGHT_PPTX: PresentationPptxPalette = {
  led: "00B6C7",
  foreground: "071012",
  canvas: "F7F9FA",
  card: "FFFFFF",
  muted: "5A6567",
  border: "D5DBDD",
  ocean: "081820",
  surfaceSecondary: "EEF2F3",
  onDark: "F7F9FA",
  onDarkMuted: "A8B3B5",
};

const DARK_PPTX: PresentationPptxPalette = {
  led: "00B6C7",
  foreground: "F7F9FA",
  canvas: "071012",
  card: "081820",
  muted: "A8B3B5",
  border: "1A3A40",
  ocean: "081820",
  surfaceSecondary: "0C1A20",
  onDark: "F7F9FA",
  onDarkMuted: "A8B3B5",
};

export function getPresentationPptxPalette(
  mode: PresentationThemeMode,
): PresentationPptxPalette {
  return mode === "dark" ? DARK_PPTX : LIGHT_PPTX;
}

export function normalizePresentationTheme(
  value: string | null | undefined,
): PresentationThemeMode {
  return value === "dark" ? "dark" : "light";
}
