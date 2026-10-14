import { randomBytes } from "crypto";
import { isErpAttachmentUrl, saveErpAttachment } from "@/lib/erp-attachment";

export const PRESENTATION_UPLOAD_PREFIX = "/tmp/presentations";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function isPresentationUploadUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const value = url.trim();
  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith(`${PRESENTATION_UPLOAD_PREFIX}/`) ||
    isErpAttachmentUrl(value)
  );
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

/** Se guarda en la base: el disco de Render se borra en cada deploy y public/ solo sirve lo que había al compilar. */
export async function savePresentationImage(buffer: Buffer, mime = "image/jpeg"): Promise<string> {
  const ext = extFromMime(mime);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Formato de imagen no soportado.");
  }
  const name = `presentacion-${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  return saveErpAttachment(buffer, name, mime);
}
