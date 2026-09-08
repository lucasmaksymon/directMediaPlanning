import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const PRESENTATION_UPLOAD_PREFIX = "/tmp/presentations";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function isPresentationUploadUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const value = url.trim();
  return /^https?:\/\//i.test(value) || value.startsWith(`${PRESENTATION_UPLOAD_PREFIX}/`);
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

export async function savePresentationImage(buffer: Buffer, mime = "image/jpeg"): Promise<string> {
  const ext = extFromMime(mime);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Formato de imagen no soportado.");
  }
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "tmp", "presentations");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return `${PRESENTATION_UPLOAD_PREFIX}/${name}`;
}
