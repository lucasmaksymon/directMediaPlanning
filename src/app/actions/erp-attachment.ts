"use server";

import { requireOpsSession } from "@/lib/ops-access";
import { saveErpAttachment } from "@/lib/erp-attachment";
import { inferOcrMime } from "@/lib/erp-ocr";
import { erpFail } from "@/lib/erp-write";

export type StoreErpAttachmentResult = { ok: true; url: string } | { ok: false; error: string };

export async function storeErpAttachment(formData: FormData): Promise<StoreErpAttachmentResult> {
  try {
    await requireOpsSession();
    const file = formData.get("file");
    if (!file || typeof file === "string" || !("arrayBuffer" in file) || file.size === 0) {
      throw new Error("Subí un PDF o una imagen.");
    }
    const filename = ("name" in file && typeof file.name === "string" && file.name) || "comprobante";
    const mime = inferOcrMime(file.type, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    const url = await saveErpAttachment(bytes, filename, mime);
    return { ok: true, url };
  } catch (e) {
    return erpFail(e);
  }
}
