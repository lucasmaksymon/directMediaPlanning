import fs from "fs";
import path from "path";
import {
  BRAND_LOGO_COLOR_FILE,
  brandWordmarkFileName,
} from "@/lib/presentations/brand-logo";
import type { PresentationThemeMode } from "@/lib/presentations/theme";

export function brandWordmarkAbsolutePath(theme: PresentationThemeMode) {
  return path.join(process.cwd(), "public", "brand", brandWordmarkFileName(theme));
}

function pngDataUri(filePath: string) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Data URI para react-pdf (rutas de archivo fallan en Windows). */
export function brandWordmarkDataUri(theme: PresentationThemeMode) {
  return pngDataUri(brandWordmarkAbsolutePath(theme));
}

export function brandLogoColorDataUri() {
  return pngDataUri(path.join(process.cwd(), "public", "brand", BRAND_LOGO_COLOR_FILE));
}
