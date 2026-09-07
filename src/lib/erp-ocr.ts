import { openai } from "@/lib/openai";
import { ERP_DOC_TYPES, ERP_ISSUER, ERP_PAY, parseMoney } from "@/lib/erp";

export const OCR_KINDS = ["sale_invoice", "purchase_invoice", "sale_receipt"] as const;
export type OcrKind = (typeof OCR_KINDS)[number];

export const OCR_MAX_BYTES = 10 * 1024 * 1024;

export type OcrParty = {
  legalName: string | null;
  taxId: string | null;
};

export type OcrPaymentLine = {
  paymentKind: number;
  number: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  amount: number;
  checkOrder: number;
  checkType: number;
  checkMode: number;
};

export type OcrExtracted = {
  kind: OcrKind;
  docType: string | null;
  pos: number | null;
  number: number | null;
  issuedAt: string | null;
  dueAt: string | null;
  isCreditNote: boolean;
  detail: string | null;
  issuer: OcrParty;
  recipient: OcrParty;
  amount: number | null;
  vat: number | null;
  total: number | null;
  nonTaxable: number | null;
  internalTax: number | null;
  retVat: number | null;
  retGan: number | null;
  retSuss: number | null;
  retIibb: number | null;
  iibbCaba: number | null;
  iibbBsAs: number | null;
  vatWithholding: number | null;
  collected: number | null;
  balance: number | null;
  payments: OcrPaymentLine[];
  cae: string | null;
  warnings: string[];
  fieldConfidence: Record<string, number>;
};

export type OcrMatchOption = {
  id: string;
  label: string;
  score: number;
};

export type OcrDuplicate = {
  id: string;
  label: string;
};

export type OcrMatchResult = {
  extracted: OcrExtracted;
  attachmentUrl: string | null;
  client: OcrMatchOption | null;
  vendor: OcrMatchOption | null;
  saleOrder: OcrMatchOption | null;
  purchaseOrder: OcrMatchOption | null;
  invoices: OcrMatchOption[];
  duplicate: OcrDuplicate | null;
  ready: boolean;
  blockers: string[];
};

const KIND_LABEL: Record<OcrKind, string> = {
  sale_invoice: "factura de venta (emitida por NextMedia al cliente)",
  purchase_invoice: "factura de compra (emitida por un proveedor o imprenta a NextMedia)",
  sale_receipt: "recibo de cobranza de venta (NextMedia cobra a un cliente)",
};

const NEXTMEDIA_CUIT = "30711447675";

export function normalizeCuit(raw: string | null | undefined) {
  return String(raw ?? "").replace(/\D/g, "");
}

export function foldName(raw: string | null | undefined) {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isOurCompany(party: OcrParty | null | undefined) {
  if (!party) return false;
  const cuit = normalizeCuit(party.taxId);
  if (cuit && cuit === NEXTMEDIA_CUIT) return true;
  const name = foldName(party.legalName);
  return name.includes("next international") || name.includes("nextmedia") || name.includes("next media");
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = parseMoney(String(value));
  return n === 0 && String(value).replace(/[^\d]/g, "") === "" ? null : n;
}

function int(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function text(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

function dateText(value: unknown): string | null {
  const s = text(value);
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(s);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return null;
}

function party(raw: unknown): OcrParty {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    legalName: text(row.legalName ?? row.razonSocial ?? row.name),
    taxId: text(row.taxId ?? row.cuit) ? formatCuit(String(row.taxId ?? row.cuit)) : null,
  };
}

export function formatCuit(raw: string) {
  const digits = normalizeCuit(raw);
  if (digits.length !== 11) return raw.trim() || null;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function paymentKindFromLabel(raw: string) {
  const s = foldName(raw);
  if (s.includes("suss")) return ERP_PAY.retSuss;
  if (s.includes("ganancia")) return ERP_PAY.retGan;
  if (s.includes("iibb") && s.includes("caba")) return ERP_PAY.retIibbAlt;
  if (s.includes("iibb") || s.includes("ingresos brutos")) return ERP_PAY.retIibb;
  if (s.includes("iva") && (s.includes("retenc") || s.includes("ret"))) return ERP_PAY.retVat;
  if (s.includes("efectivo") || s.includes("cash")) return ERP_PAY.cash;
  if (s.includes("cheque") || s.includes("echeq") || s.includes("e cheq")) return ERP_PAY.cheque;
  return ERP_PAY.transfer;
}

function payments(raw: unknown): OcrPaymentLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const kindRaw = row.paymentKind ?? row.kind ?? row.tipo;
      const paymentKind =
        typeof kindRaw === "number" || (typeof kindRaw === "string" && /^\d+$/.test(kindRaw.trim()))
          ? Number(kindRaw)
          : paymentKindFromLabel(String(kindRaw ?? "transferencia"));
      return {
        paymentKind: Number.isFinite(paymentKind) ? paymentKind : ERP_PAY.transfer,
        number: text(row.number ?? row.chequeNumber),
        issuedAt: dateText(row.issuedAt ?? row.fecha),
        paidAt: dateText(row.paidAt ?? row.fechaPago),
        amount: num(row.amount) ?? 0,
        checkOrder: int(row.checkOrder) ?? 0,
        checkType: int(row.checkType) ?? 0,
        checkMode: int(row.checkMode) ?? 0,
      };
    })
    .filter((line) => line.amount > 0 || line.number);
}

function normalizeDocType(raw: unknown, isCreditNote: boolean): string | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (isCreditNote || s.includes("NC") || s.includes("CREDITO") || s.includes("CRÉDITO")) return "NC";
  const letter = s.replace(/[^A-Z]/g, "");
  if (letter === "X") return "X";
  if (ERP_DOC_TYPES.includes(letter as (typeof ERP_DOC_TYPES)[number])) return letter;
  const compact = s.replace(/\s+/g, "");
  if (compact.startsWith("FA") || compact.startsWith("FCA")) {
    const last = compact.replace(/[^A-E]/g, "").slice(-1);
    if (ERP_DOC_TYPES.includes(last as (typeof ERP_DOC_TYPES)[number])) return last;
  }
  return letter ? letter.slice(0, 2) : null;
}

function parsePosNumber(raw: unknown): { pos: number | null; number: number | null } {
  const s = String(raw ?? "").trim();
  const pair = /(\d{1,5})\s*[-/]\s*(\d{1,8})/.exec(s);
  if (pair) return { pos: Number(pair[1]), number: Number(pair[2]) };
  return { pos: int(raw), number: null };
}

export function parseOcrExtracted(raw: unknown, kindHint: OcrKind): OcrExtracted {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const isCreditNote = Boolean(row.isCreditNote) || /nc|credito|crédito/i.test(String(row.docType ?? ""));
  const docType = normalizeDocType(row.docType, isCreditNote);
  let pos = int(row.pos ?? row.punto);
  let number = int(row.number ?? row.numero);
  if (pos == null || number == null) {
    const parsed = parsePosNumber(row.fullNumber ?? row.comprobante ?? row.number);
    pos ??= parsed.pos;
    number ??= parsed.number;
  }
  const extracted: OcrExtracted = {
    kind: kindHint,
    docType,
    pos,
    number,
    issuedAt: dateText(row.issuedAt ?? row.fecha),
    dueAt: dateText(row.dueAt ?? row.vencimiento),
    isCreditNote,
    detail: text(row.detail ?? row.concepto ?? row.detalle),
    issuer: party(row.issuer ?? row.emisor),
    recipient: party(row.recipient ?? row.receptor ?? row.cliente),
    amount: num(row.amount ?? row.neto ?? row.gravado),
    vat: num(row.vat ?? row.iva),
    total: num(row.total),
    nonTaxable: num(row.nonTaxable ?? row.noGravado),
    internalTax: num(row.internalTax ?? row.impuestosInternos),
    retVat: num(row.retVat ?? row.retencionIva),
    retGan: num(row.retGan ?? row.retencionGanancias),
    retSuss: num(row.retSuss ?? row.retencionSuss),
    retIibb: num(row.retIibb ?? row.retencionIibb),
    iibbCaba: num(row.iibbCaba),
    iibbBsAs: num(row.iibbBsAs),
    vatWithholding: num(row.vatWithholding ?? row.retVat ?? row.retencionIva),
    collected: num(row.collected ?? row.cobrado),
    balance: num(row.balance ?? row.saldo),
    payments: payments(row.payments),
    cae: text(row.cae),
    warnings: Array.isArray(row.warnings) ? row.warnings.map((w) => String(w)).filter(Boolean) : [],
    fieldConfidence:
      row.fieldConfidence && typeof row.fieldConfidence === "object"
        ? Object.fromEntries(
            Object.entries(row.fieldConfidence as Record<string, unknown>).map(([k, v]) => [k, Number(v) || 0]),
          )
        : {},
  };
  if (extracted.amount == null && extracted.total != null) {
    extracted.amount = Math.max(0, extracted.total - (extracted.vat ?? 0) - (extracted.nonTaxable ?? 0));
  }
  if (extracted.total == null && extracted.amount != null) {
    extracted.total = extracted.amount + (extracted.vat ?? 0) + (extracted.nonTaxable ?? 0) + (extracted.internalTax ?? 0);
  }
  if (kindHint === "sale_receipt" && extracted.balance == null && extracted.amount != null) {
    extracted.balance = 0;
  }
  return addDerivedWarnings(extracted);
}

function addDerivedWarnings(extracted: OcrExtracted): OcrExtracted {
  const warnings = [...extracted.warnings];
  const parts =
    (extracted.amount ?? 0) + (extracted.vat ?? 0) + (extracted.nonTaxable ?? 0) + (extracted.internalTax ?? 0);
  if (extracted.total != null && extracted.amount != null && Math.abs(parts - extracted.total) > 1.5) {
    warnings.push(`El total (${extracted.total}) no cierra con neto + IVA (${parts}).`);
  }
  for (const partyRow of [extracted.issuer, extracted.recipient]) {
    const cuit = normalizeCuit(partyRow.taxId);
    if (cuit && cuit.length !== 11) warnings.push(`CUIT con formato dudoso: ${partyRow.taxId}.`);
  }
  if (extracted.number == null) warnings.push("No se leyó el número de comprobante.");
  if (!extracted.issuedAt) warnings.push("No se leyó la fecha.");
  return { ...extracted, warnings: [...new Set(warnings)] };
}

function parseJsonPayload(raw: string) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("La IA no devolvió un JSON válido.");
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

function ocrPrompt(kindHint: OcrKind, filename: string) {
  return `Extraé los datos de este comprobante argentino (AFIP / recibo de cobranza) y devolvélos SOLO como JSON.

Tipo esperado: ${KIND_LABEL[kindHint]}.
Nombre de archivo: ${filename}
Nuestra empresa suele figurar como ${ERP_ISSUER.legalName} / CUIT ${ERP_ISSUER.tax}.

Reglas:
- Fechas en YYYY-MM-DD.
- Importes como números (1234.56), no strings. Neto en amount, IVA en vat, total en total.
- El número de factura suele ser Punto-Número (00003-00000616 → pos 3, number 616).
- docType: A, B, C, E o NC. Recibos de cobranza suelen ser X; igual devolvê number.
- issuer = quien emite. recipient = destinatario.
- En factura de venta el cliente es el receptor. En factura de compra el proveedor es el emisor.
- En recibo de cobranza el cliente es a quien se cobra (no NextMedia).
- payments: solo en recibos. paymentKind: 0 transferencia, 1 cheque, 2 efectivo, 3 ret.IVA, 4 ret.IIBB, 5 ret.IIBB CABA, 6 ret.Ganancias, 7 ret.SUSS.
- Si un campo no está, usá null. No inventes CUITs ni números.
- warnings: problemas de lectura o inconsistencias.
- fieldConfidence: 0 a 1 por campo clave (number, issuedAt, amount, taxId).

JSON:
{
  "kind": "${kindHint}",
  "docType": "A",
  "pos": 1,
  "number": 1,
  "issuedAt": "2026-01-15",
  "dueAt": null,
  "isCreditNote": false,
  "detail": null,
  "issuer": { "legalName": "", "taxId": "" },
  "recipient": { "legalName": "", "taxId": "" },
  "amount": 0,
  "vat": 0,
  "total": 0,
  "nonTaxable": 0,
  "internalTax": 0,
  "retVat": 0,
  "retGan": 0,
  "retSuss": 0,
  "retIibb": 0,
  "iibbCaba": 0,
  "iibbBsAs": 0,
  "vatWithholding": 0,
  "collected": 0,
  "balance": 0,
  "payments": [],
  "cae": null,
  "warnings": [],
  "fieldConfidence": {}
}`;
}

function isPdf(mime: string, filename: string) {
  return mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
}

function isImage(mime: string, filename: string) {
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(filename);
}

export function inferOcrMime(mime: string | null | undefined, filename: string) {
  if (mime && mime !== "application/octet-stream") return mime;
  if (filename.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.gif$/i.test(filename)) return "image/gif";
  return "image/jpeg";
}

export async function extractErpDocument(input: {
  bytes: Buffer;
  mime: string;
  filename: string;
  kindHint: OcrKind;
}): Promise<OcrExtracted> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("El servicio de IA no está configurado. Agregá OPENAI_API_KEY al entorno.");
  }
  if (input.bytes.length > OCR_MAX_BYTES) {
    throw new Error("El archivo supera 10 MB.");
  }
  const mime = inferOcrMime(input.mime, input.filename);
  const model = process.env.OPENAI_OCR_MODEL || "gpt-4o";
  const dataUrl = `data:${mime};base64,${input.bytes.toString("base64")}`;
  const prompt = ocrPrompt(input.kindHint, input.filename);

  const content = isPdf(mime, input.filename)
    ? [
        { type: "input_file" as const, filename: input.filename, file_data: dataUrl },
        { type: "input_text" as const, text: prompt },
      ]
    : isImage(mime, input.filename)
      ? [
          { type: "input_image" as const, image_url: dataUrl, detail: "high" as const },
          { type: "input_text" as const, text: prompt },
        ]
      : null;
  if (!content) {
    throw new Error("Solo se pueden leer PDF o imágenes (JPG, PNG, WEBP).");
  }

  try {
    const response = await openai.responses.create({
      model,
      input: [{ role: "user", content }],
      text: { format: { type: "json_object" } },
    });
    const raw = response.output_text?.trim() ?? "";
    if (!raw) throw new Error("La IA no devolvió texto.");
    return parseOcrExtracted(parseJsonPayload(raw), input.kindHint);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/invalid.*pdf|unsupported.*file|file_data/i.test(message)) {
      throw new Error("No se pudo leer el PDF. Probá exportarlo de nuevo o subí una imagen.");
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function fetchOcrFile(fileUrl: string) {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error("No se pudo descargar el archivo subido.");
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "";
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > OCR_MAX_BYTES) throw new Error("El archivo supera 10 MB.");
  return { bytes, mime };
}

export type OcrFormDraft = {
  saleOrderId: string;
  vendorId: string;
  orderId: string;
  clientId: string;
  invoiceIds: string[];
  legalName: string;
  receiptRef: string;
  issuedAt: string;
  dueAt: string;
  docType: string;
  pos: string;
  number: string;
  amount: string;
  vat: string;
  detail: string;
  collected: string;
  echeq: string;
  bank: string;
  retVat: string;
  retGan: string;
  retSuss: string;
  retIibb: string;
  vatWithholding: string;
  iibbCaba: string;
  iibbBsAs: string;
  internalTax: string;
  nonTaxable: string;
  isCreditNote: string;
  diegoFee: string;
  balance: string;
  attachmentUrl: string;
  payments: Array<{
    paymentKind: string;
    number: string;
    issuedAt: string;
    paidAt: string;
    checkOrder: string;
    checkType: string;
    checkMode: string;
    amount: string;
    estado: string;
    attachmentUrl: string;
  }>;
};

function moneyStr(value: number | null | undefined) {
  return value == null ? "0" : String(value);
}

export function ocrDraftFromMatch(result: OcrMatchResult): OcrFormDraft {
  const e = result.extracted;
  const legalName =
    e.kind === "purchase_invoice"
      ? e.issuer.legalName ?? ""
      : e.recipient.legalName || e.issuer.legalName || "";
  return {
    saleOrderId: result.saleOrder?.id ?? "",
    vendorId: result.vendor?.id ?? "",
    orderId: result.purchaseOrder?.id ?? "",
    clientId: result.client?.id ?? "",
    invoiceIds: result.invoices.map((item) => item.id),
    legalName,
    receiptRef: "",
    issuedAt: e.issuedAt ?? "",
    dueAt: e.dueAt ?? "",
    docType: e.docType ?? (e.kind === "sale_receipt" ? "X" : "A"),
    pos: String(e.pos ?? 1),
    number: e.number != null ? String(e.number) : "",
    amount: moneyStr(e.amount),
    vat: moneyStr(e.vat),
    detail: e.detail ?? "",
    collected: moneyStr(e.collected),
    echeq: "0",
    bank: "0",
    retVat: moneyStr(e.retVat ?? e.vatWithholding),
    retGan: moneyStr(e.retGan),
    retSuss: moneyStr(e.retSuss),
    retIibb: moneyStr(e.retIibb),
    vatWithholding: moneyStr(e.vatWithholding ?? e.retVat),
    iibbCaba: moneyStr(e.iibbCaba),
    iibbBsAs: moneyStr(e.iibbBsAs),
    internalTax: moneyStr(e.internalTax),
    nonTaxable: moneyStr(e.nonTaxable),
    isCreditNote: e.isCreditNote ? "1" : "0",
    diegoFee: "0",
    balance: moneyStr(e.balance),
    attachmentUrl: result.attachmentUrl ?? "",
    payments: e.payments.map((line, index) => ({
      paymentKind: String(line.paymentKind),
      number: line.number ?? "",
      issuedAt: line.issuedAt ?? "",
      paidAt: line.paidAt ?? "",
      checkOrder: String(line.checkOrder),
      checkType: String(line.checkType),
      checkMode: String(line.checkMode),
      amount: moneyStr(line.amount),
      estado: "1",
      attachmentUrl: index === 0 ? (result.attachmentUrl ?? "") : "",
    })),
  };
}
