import fs from "fs";
import path from "path";
import {
  brandWordmarkFileName,
} from "@/lib/presentations/brand-logo";
import type { PresentationThemeMode } from "@/lib/presentations/theme";

export function brandWordmarkAbsolutePath(theme: PresentationThemeMode) {
  return path.join(process.cwd(), "public", "brand", brandWordmarkFileName(theme));
}

/** Data URI para react-pdf (rutas de archivo fallan en Windows). */
export function brandWordmarkDataUri(theme: PresentationThemeMode) {
  const filePath = brandWordmarkAbsolutePath(theme);
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
