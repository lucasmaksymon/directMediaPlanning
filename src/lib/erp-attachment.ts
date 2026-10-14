import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

/** Solo lectura: adjuntos viejos que quedaron en disco en instalaciones locales. */
const LEGACY_ATTACH_DIR = path.join(process.cwd(), "uploads", "erp-attachments");
const SAFE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpe?g|webp|gif)$/i;

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function extFor(filename: string, mime: string) {
  const fromName = path.extname(filename).toLowerCase();
  if (fromName && MIME_BY_EXT[fromName]) return fromName;
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

export function erpAttachmentUrl(id: string, filename?: string) {
  const url = `/api/erp/attachments/${encodeURIComponent(id)}`;
  const name = filename?.trim();
  return name ? `${url}?name=${encodeURIComponent(name)}` : url;
}

const URL_PREFIX = "/api/erp/attachments/";

export function isErpAttachmentUrl(url: string | null | undefined) {
  return Boolean(url?.trim().startsWith(URL_PREFIX));
}

/** Lee un adjunto a partir de la URL que devuelve saveErpAttachment (para usarlo del lado del servidor). */
export async function readErpAttachmentByUrl(url: string) {
  if (!isErpAttachmentUrl(url)) return null;
  const id = url.trim().slice(URL_PREFIX.length).split("?")[0];
  try {
    return await readErpAttachment(decodeURIComponent(id));
  } catch {
    return null;
  }
}

export async function saveErpAttachment(bytes: Buffer, filename: string, mime: string) {
  const ext = extFor(filename, mime);
  const id = `${randomUUID()}${ext}`;
  await prisma.erpAttachment.create({
    data: {
      id,
      filename: filename.trim() || id,
      mime: MIME_BY_EXT[ext] || mime || "application/octet-stream",
      size: bytes.length,
      bytes: new Uint8Array(bytes),
    },
  });
  return erpAttachmentUrl(id, filename);
}

export async function readErpAttachment(id: string) {
  if (!SAFE_ID.test(id)) return null;
  const row = await prisma.erpAttachment.findUnique({ where: { id } });
  if (row) return { bytes: Buffer.from(row.bytes), mime: row.mime, filename: row.filename };
  try {
    const ext = path.extname(id).toLowerCase();
    const bytes = await readFile(path.join(LEGACY_ATTACH_DIR, id));
    return {
      bytes,
      mime: MIME_BY_EXT[ext] || "application/octet-stream",
      filename: id,
    };
  } catch {
    return null;
  }
}
