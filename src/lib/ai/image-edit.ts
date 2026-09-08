import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import type OpenAI from "openai";
import { toFile } from "openai";
import { UTApi, UTFile } from "uploadthing/server";
import { savePresentationImage } from "@/lib/presentations/local-upload";

function hasUploadThingToken() {
  const token = process.env.UPLOADTHING_TOKEN?.trim();
  return Boolean(token && token !== "..." && token.length > 20);
}

export function imageResultToUrl(item: OpenAI.Images.Image | undefined): string | null {
  if (!item) return null;
  if (item.url) return item.url;
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return null;
}

function mimeFromExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

/** Evita path traversal: solo archivos dentro de public/. */
function resolveSafePublicImage(url: string): string | null {
  if (!url.startsWith("/")) return null;
  const publicRoot = path.resolve(process.cwd(), "public");
  const candidate = path.resolve(publicRoot, url.replace(/^\/+/, ""));
  const rootWithSep = publicRoot.endsWith(path.sep) ? publicRoot : `${publicRoot}${path.sep}`;
  if (candidate !== publicRoot && !candidate.startsWith(rootWithSep)) return null;
  return existsSync(candidate) ? candidate : null;
}

export async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    const local = resolveSafePublicImage(trimmed);
    if (!local) {
      throw new Error("No se encontró la foto del cartel.");
    }
    const buffer = await readFile(local);
    const ext = path.extname(local).replace(".", "") || "jpg";
    return { buffer, mime: mimeFromExt(ext), ext };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("URL de imagen inválida.");
  }

  const res = await fetch(trimmed, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DirectMediaPlanning/1.0)",
      Accept: "image/*",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`No se pudo descargar la imagen (${res.status}). Usá una URL directa.`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("La URL no apunta a una imagen válida.");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = extFromContentType(contentType);
  return { buffer, mime: contentType, ext };
}

export async function fetchImageAsFile(url: string, filename: string) {
  const { buffer, mime, ext } = await fetchImageBuffer(url);
  return toFile(buffer, `${filename}.${ext}`, { type: mime });
}

/** Solo gpt-image-1 / gpt-image-1.5 aceptan input_fidelity; gpt-image-2+ lo procesan en alta fidelidad sin el parámetro. */
export function supportsInputFidelity(model: string): boolean {
  if (model.startsWith("gpt-image-2") || model.includes("gpt-image-1-mini")) return false;
  return model === "gpt-image-1" || model.startsWith("gpt-image-1.5");
}

export async function persistGeneratedImage(item: OpenAI.Images.Image): Promise<string> {
  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    if (hasUploadThingToken()) {
      const utapi = new UTApi();
      const file = new UTFile([buffer], `presentation-mockup-${Date.now()}.png`, { type: "image/png" });
      const result = await utapi.uploadFiles(file);
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? "No se pudo guardar el mockup.");
      }
      return result.data.ufsUrl ?? result.data.url;
    }
    return savePresentationImage(buffer, "image/png");
  }

  if (item.url) {
    if (hasUploadThingToken()) {
      const utapi = new UTApi();
      const result = await utapi.uploadFilesFromUrl(item.url);
      if (result.error || !result.data) {
        throw new Error(result.error?.message ?? "No se pudo guardar el mockup.");
      }
      return result.data.ufsUrl ?? result.data.url;
    }
    const res = await fetch(item.url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error("No se pudo descargar el mockup generado.");
    const buffer = Buffer.from(await res.arrayBuffer());
    return savePresentationImage(buffer, res.headers.get("content-type") ?? "image/png");
  }

  throw new Error("La IA no devolvió una imagen.");
}
