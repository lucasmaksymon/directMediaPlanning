"use server";

import { requireOpsSession } from "@/lib/ops-access";
import { erpFail, type ErpResult } from "@/lib/erp-write";
import { saveErpAttachment } from "@/lib/erp-attachment";
import {
  extractErpDocument,
  inferOcrMime,
  OCR_KINDS,
  type OcrKind,
  type OcrMatchResult,
  type OcrPaymentLine,
} from "@/lib/erp-ocr";
import { matchOcrExtracted } from "@/lib/erp-ocr-match";
import {
  createErpPurchaseInvoice,
  createErpSaleInvoice,
  createErpSaleReceipt,
} from "@/app/actions/erp-billing";

export type OcrDocumentResult = { ok: true; result: OcrMatchResult } | { ok: false; error: string };

function moneyField(value: number | string | null | undefined) {
  if (value == null || value === "") return "0";
  return String(value);
}

export async function ocrErpDocument(formData: FormData): Promise<OcrDocumentResult> {
  try {
    await requireOpsSession();
    const file = formData.get("file");
    if (!file || typeof file === "string" || !("arrayBuffer" in file) || file.size === 0) {
      throw new Error("Subí un PDF o una imagen.");
    }
    const kindHint = String(formData.get("kindHint") ?? "") as OcrKind;
    if (!OCR_KINDS.includes(kindHint)) throw new Error("Tipo de comprobante inválido.");
    const filename = ("name" in file && typeof file.name === "string" && file.name) || "comprobante";
    const mime = inferOcrMime(file.type, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    const [extracted, attachmentUrl] = await Promise.all([
      extractErpDocument({ bytes, mime, filename, kindHint }),
      saveErpAttachment(bytes, filename, mime),
    ]);
    const matched = await matchOcrExtracted(extracted, kindHint, {
      issuedOnly: String(formData.get("issuedOnly") ?? "1") !== "0",
    });
    return {
      ok: true,
      result: {
        ...matched,
        attachmentUrl,
      },
    };
  } catch (e) {
    return erpFail(e);
  }
}

export type ImportOcrSaleInvoiceRow = {
  saleOrderId: string;
  issuedAt: string;
  dueAt?: string;
  docType: string;
  pos: number | string;
  number: number | string;
  amount: number | string;
  vat: number | string;
  legalName?: string;
  detail?: string;
  collected?: number | string;
  receiptRef?: string;
  retVat?: number | string;
  retSuss?: number | string;
  retGan?: number | string;
  retIibb?: number | string;
  echeq?: number | string;
  bank?: number | string;
  attachmentUrl?: string;
  collectStatus?: number | string;
};

export type ImportOcrPurchaseInvoiceRow = {
  vendorId: string;
  orderId: string;
  issuedAt: string;
  dueAt?: string;
  docType: string;
  pos: number | string;
  number: number | string;
  amount: number | string;
  vat: number | string;
  vatWithholding?: number | string;
  iibbCaba?: number | string;
  iibbBsAs?: number | string;
  internalTax?: number | string;
  nonTaxable?: number | string;
  diegoFee?: number | string;
  isCreditNote?: string;
  payStatus?: number | string;
  attachmentUrl?: string;
};

export type ImportOcrSaleReceiptRow = {
  clientId: string;
  issuedAt: string;
  number: number | string;
  amount: number | string;
  balance?: number | string;
  invoiceIds?: string[];
  attachmentUrl?: string;
  payments?: OcrPaymentLine[];
};

export type ImportOcrRowResult = { index: number; ok: boolean; error?: string };

function saleInvoiceForm(row: ImportOcrSaleInvoiceRow) {
  const fd = new FormData();
  fd.set("saleOrderId", row.saleOrderId);
  fd.set("issuedAt", row.issuedAt);
  if (row.dueAt) fd.set("dueAt", row.dueAt);
  fd.set("docType", row.docType || "A");
  fd.set("pos", String(row.pos ?? 1));
  fd.set("number", String(row.number ?? ""));
  fd.set("amount", moneyField(row.amount));
  fd.set("vat", moneyField(row.vat));
  fd.set("legalName", row.legalName ?? "");
  fd.set("detail", row.detail ?? "");
  fd.set("collected", moneyField(row.collected));
  fd.set("receiptRef", row.receiptRef ?? "");
  fd.set("retVat", moneyField(row.retVat));
  fd.set("retSuss", moneyField(row.retSuss));
  fd.set("retGan", moneyField(row.retGan));
  fd.set("retIibb", moneyField(row.retIibb));
  fd.set("echeq", moneyField(row.echeq));
  fd.set("bank", moneyField(row.bank));
  fd.set("attachmentUrl", row.attachmentUrl ?? "");
  fd.set("collectStatus", String(row.collectStatus ?? 0));
  return fd;
}

function purchaseInvoiceForm(row: ImportOcrPurchaseInvoiceRow) {
  const fd = new FormData();
  fd.set("vendorId", row.vendorId);
  fd.set("orderId", row.orderId);
  fd.set("isVatPurchase", "0");
  fd.set("issuedAt", row.issuedAt);
  if (row.dueAt) fd.set("dueAt", row.dueAt);
  fd.set("docType", row.docType || "A");
  fd.set("pos", String(row.pos ?? 1));
  fd.set("number", String(row.number ?? ""));
  fd.set("amount", moneyField(row.amount));
  fd.set("vat", moneyField(row.vat));
  fd.set("vatWithholding", moneyField(row.vatWithholding));
  fd.set("iibbCaba", moneyField(row.iibbCaba));
  fd.set("iibbBsAs", moneyField(row.iibbBsAs));
  fd.set("internalTax", moneyField(row.internalTax));
  fd.set("nonTaxable", moneyField(row.nonTaxable));
  fd.set("diegoFee", moneyField(row.diegoFee));
  fd.set("isCreditNote", row.isCreditNote ?? "0");
  fd.set("payStatus", String(row.payStatus ?? 0));
  fd.set("attachmentUrl", row.attachmentUrl ?? "");
  return fd;
}

function saleReceiptForm(row: ImportOcrSaleReceiptRow) {
  const fd = new FormData();
  fd.set("clientId", row.clientId);
  fd.set("issuedAt", row.issuedAt);
  fd.set("number", String(row.number ?? ""));
  fd.set("amount", moneyField(row.amount));
  fd.set("balance", moneyField(row.balance));
  fd.set("attachmentUrl", row.attachmentUrl ?? "");
  for (const id of row.invoiceIds ?? []) fd.append("invoiceId", id);
  const payments = row.payments?.length
    ? row.payments
    : row.attachmentUrl
      ? [
          {
            paymentKind: 0,
            number: null,
            issuedAt: row.issuedAt,
            paidAt: row.issuedAt,
            amount: Number(row.amount) || 0,
            checkOrder: 0,
            checkType: 0,
            checkMode: 0,
          },
        ]
      : [];
  for (const line of payments) {
    fd.append("py.paymentKind", String(line.paymentKind));
    fd.append("py.number", line.number ?? "");
    fd.append("py.issuedAt", line.issuedAt ?? "");
    fd.append("py.paidAt", line.paidAt ?? "");
    fd.append("py.checkOrder", String(line.checkOrder ?? 0));
    fd.append("py.checkType", String(line.checkType ?? 0));
    fd.append("py.checkMode", String(line.checkMode ?? 0));
    fd.append("py.amount", moneyField(line.amount));
    fd.append("py.estado", "1");
    fd.append("py.attachmentUrl", row.attachmentUrl ?? "");
  }
  return fd;
}

async function runImports<T>(
  rows: T[],
  save: (row: T) => Promise<ErpResult>,
): Promise<{ ok: true; results: ImportOcrRowResult[] } | { ok: false; error: string }> {
  try {
    await requireOpsSession();
    const results: ImportOcrRowResult[] = [];
    for (const [index, row] of rows.entries()) {
      const res = await save(row);
      results.push(res.ok ? { index, ok: true } : { index, ok: false, error: res.error });
    }
    return { ok: true, results };
  } catch (e) {
    return erpFail(e);
  }
}

export async function importOcrSaleInvoices(rows: ImportOcrSaleInvoiceRow[]) {
  return runImports(rows, (row) => createErpSaleInvoice(saleInvoiceForm(row)));
}

export async function importOcrPurchaseInvoices(rows: ImportOcrPurchaseInvoiceRow[]) {
  return runImports(rows, (row) => createErpPurchaseInvoice(purchaseInvoiceForm(row)));
}

export async function importOcrSaleReceipts(rows: ImportOcrSaleReceiptRow[]) {
  return runImports(rows, (row) => createErpSaleReceipt(saleReceiptForm(row)));
}
