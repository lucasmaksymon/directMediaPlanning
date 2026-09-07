import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const ATTACH_DIR = path.join(process.cwd(), "uploads", "erp-attachments");
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

export async function saveErpAttachment(bytes: Buffer, filename: string, mime: string) {
  await mkdir(ATTACH_DIR, { recursive: true });
  const id = `${randomUUID()}${extFor(filename, mime)}`;
  await writeFile(path.join(ATTACH_DIR, id), bytes);
  return erpAttachmentUrl(id, filename);
}

export async function readErpAttachment(id: string) {
  if (!SAFE_ID.test(id)) return null;
  try {
    const ext = path.extname(id).toLowerCase();
    const bytes = await readFile(path.join(ATTACH_DIR, id));
    return {
      bytes,
      mime: MIME_BY_EXT[ext] || "application/octet-stream",
      filename: id,
    };
  } catch {
    return null;
  }
}
