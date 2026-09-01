import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { imageSize } from "image-size";
import sharp from "sharp";
import type { PresentationSlideResolved } from "@/lib/presentations/types";

/** Lado largo para ficha A4/PPTX: alcanza y evita OOM en Render. */
const EXPORT_MAX_EDGE = 1280;
const EXPORT_JPEG_QUALITY = 72;

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
function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  const err = new Error("Exportación cancelada.");
  err.name = "AbortError";
  throw err;
}

async function compressForExport(buf: Buffer): Promise<LoadedImage> {
  try {
    const out = await sharp(buf, { failOn: "none", limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: EXPORT_MAX_EDGE,
        height: EXPORT_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: EXPORT_JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return {
      src: `data:image/jpeg;base64,${out.data.toString("base64")}`,
      width: out.info.width,
      height: out.info.height,
    };
  } catch {
    const dims = dimsFromBuffer(buf);
    const mime = "image/jpeg";
    return { src: `data:${mime};base64,${buf.toString("base64")}`, ...dims };
  }
}

export async function loadImageAsDataUri(
  imageUrl: string | null | undefined,
  signal?: AbortSignal,
): Promise<LoadedImage | null> {
  if (!imageUrl?.trim()) return null;
  const url = imageUrl.trim();
  throwIfAborted(signal);

  try {
    if (url.startsWith("/")) {
      const local = resolveLocalImagePath(url);
      if (!local) return null;
      const buf = await readFile(local);
      return await compressForExport(buf);
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return await compressForExport(buf);
    }
  } catch (e) {
    if (signal?.aborted || (e instanceof Error && e.name === "AbortError")) {
      throwIfAborted(signal);
      throw e;
    }
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

const IMAGE_CONCURRENCY = 2;

export async function withResolvedImages(
  slides: Omit<PresentationSlideResolved, "imageSrc" | "imageWidth" | "imageHeight">[],
  mode: "dataUri" | "path" = "dataUri",
  signal?: AbortSignal,
): Promise<PresentationSlideResolved[]> {
  const cache = new Map<string, Promise<LoadedImage | null>>();
  const load = (url: string | null) => {
    if (!url) return Promise.resolve(null);
    const hit = cache.get(url);
    if (hit) return hit;
    const pending = loadImageAsDataUri(url, signal);
    cache.set(url, pending);
    return pending;
  };

  const out: PresentationSlideResolved[] = [];
  for (let i = 0; i < slides.length; i += IMAGE_CONCURRENCY) {
    throwIfAborted(signal);
    const batch = slides.slice(i, i + IMAGE_CONCURRENCY);
    const resolved = await Promise.all(
      batch.map(async (s) => {
        if (mode === "dataUri") {
          const loaded = await load(s.imageUrl);
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
