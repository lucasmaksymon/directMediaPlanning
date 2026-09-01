import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { imageSize } from "image-size";
import type { PresentationSlideResolved } from "@/lib/presentations/types";

function mimeFromPathOrUrl(src: string, contentType?: string | null): string {
  if (contentType?.startsWith("image/")) {
    if (contentType.includes("png")) return "image/png";
    if (contentType.includes("webp")) return "image/webp";
    if (contentType.includes("gif")) return "image/gif";
    return "image/jpeg";
  }
  const lower = src.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

function dimsFromBuffer(buf: Buffer): { width: number | null; height: number | null } {
  try {
    const size = imageSize(buf);
    return {
      width: size.width ?? null,
      height: size.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}

/** Ruta absoluta en disco si la URL es local y el archivo existe. */
export function resolveLocalImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl?.trim()) return null;
  const url = imageUrl.trim();
  if (!url.startsWith("/")) return null;
  const local = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  return existsSync(local) ? local : null;
}

type LoadedImage = {
  src: string;
  width: number | null;
  height: number | null;
};

/**
 * Carga una imagen de inventario como data URI + dimensiones naturales.
 * Necesario para @react-pdf en Windows: las rutas de archivo no se embeden.
 */
export async function loadImageAsDataUri(
  imageUrl: string | null | undefined,
): Promise<LoadedImage | null> {
  if (!imageUrl?.trim()) return null;
  const url = imageUrl.trim();

  try {
    if (url.startsWith("/")) {
      const local = resolveLocalImagePath(url);
      if (!local) return null;
      const buf = await readFile(local);
      const mime = mimeFromPathOrUrl(local);
      const dims = dimsFromBuffer(buf);
      return {
        src: `data:${mime};base64,${buf.toString("base64")}`,
        ...dims,
      };
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = mimeFromPathOrUrl(url, res.headers.get("content-type"));
      const dims = dimsFromBuffer(buf);
      return {
        src: `data:${mime};base64,${buf.toString("base64")}`,
        ...dims,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/** Path local o URL remota (útil para pptxgenjs). */
export function resolveImageSource(imageUrl: string | null | undefined): string | null {
  if (!imageUrl?.trim()) return null;
  const url = imageUrl.trim();
  if (url.startsWith("/")) return resolveLocalImagePath(url);
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

const IMAGE_CONCURRENCY = 6;

export async function withResolvedImages(
  slides: Omit<PresentationSlideResolved, "imageSrc" | "imageWidth" | "imageHeight">[],
  mode: "dataUri" | "path" = "dataUri",
): Promise<PresentationSlideResolved[]> {
  const out: PresentationSlideResolved[] = [];
  for (let i = 0; i < slides.length; i += IMAGE_CONCURRENCY) {
    const batch = slides.slice(i, i + IMAGE_CONCURRENCY);
    const resolved = await Promise.all(
      batch.map(async (s) => {
        if (mode === "dataUri") {
          const loaded = await loadImageAsDataUri(s.imageUrl);
          return {
            ...s,
            imageSrc: loaded?.src ?? null,
            imageWidth: loaded?.width ?? null,
            imageHeight: loaded?.height ?? null,
          };
        }
        return {
          ...s,
          imageSrc: resolveImageSource(s.imageUrl),
          imageWidth: null,
          imageHeight: null,
        };
      }),
    );
    out.push(...resolved);
  }
  return out;
}
