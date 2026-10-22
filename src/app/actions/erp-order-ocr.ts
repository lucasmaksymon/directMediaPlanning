"use server";

import { requireAdministrationSession } from "@/lib/ops-access";
import { erpFail } from "@/lib/erp-write";
import { saveErpAttachment } from "@/lib/erp-attachment";
import { inferOcrMime, requestOcrJson } from "@/lib/erp-ocr";
import {
  ORDER_OCR_KINDS,
  orderOcrPrompt,
  parseOrderOcr,
  type OrderOcrKind,
  type OrderOcrMatchResult,
} from "@/lib/erp-order-ocr";
import { matchOrderOcr } from "@/lib/erp-order-ocr-match";

export type OrderOcrResult = { ok: true; result: OrderOcrMatchResult } | { ok: false; error: string };

export async function ocrErpOrder(formData: FormData): Promise<OrderOcrResult> {
  try {
    await requireAdministrationSession();
    const file = formData.get("file");
    if (!file || typeof file === "string" || !("arrayBuffer" in file) || file.size === 0) {
      throw new Error("Subí el PDF de la orden.");
    }
    const kind = String(formData.get("kind") ?? "") as OrderOcrKind;
    if (!ORDER_OCR_KINDS.includes(kind)) throw new Error("Tipo de orden inválido.");
    const currentId = String(formData.get("currentId") ?? "") || null;
    const filename = ("name" in file && typeof file.name === "string" && file.name) || "orden";
    const mime = inferOcrMime(file.type, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    const [raw, attachmentUrl] = await Promise.all([
      requestOcrJson({ bytes, mime, filename, prompt: orderOcrPrompt(kind, filename) }),
      saveErpAttachment(bytes, filename, mime),
    ]);
    const matched = await matchOrderOcr(parseOrderOcr(raw, kind), { currentId });
    return { ok: true, result: { ...matched, attachmentUrl } };
  } catch (e) {
    return erpFail(e);
  }
}
