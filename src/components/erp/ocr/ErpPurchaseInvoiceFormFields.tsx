"use client";

import { useState } from "react";
import { Autocomplete, Input, Select } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { ErpOcrImport } from "@/components/erp/ocr/ErpOcrImport";
import { ErpOcrWarnings } from "@/components/erp/ocr/ErpOcrWarnings";
import { ERP_SETTLE, erpInputNumber, parseMoney } from "@/lib/erp";
import { vatForNet } from "@/lib/erp-ocr-score";
import { ErpOcrCandidates } from "@/components/erp/ocr/ErpOcrCandidates";
import { EMPTY_OCR_CANDIDATES, ocrDraftFromMatch, type OcrCandidates, type OcrFormDraft } from "@/lib/erp-ocr";

export type PurchaseInvoiceCurrent = {
  id: string;
  vendorId: string;
  orderId: string;
  issuedAt: string;
  docType?: string | null;
  pos?: number | null;
  number?: number | null;
  amount?: unknown;
  vat?: unknown;
  vatWithholding?: unknown;
  iibbCaba?: unknown;
  iibbBsAs?: unknown;
  internalTax?: unknown;
  nonTaxable?: unknown;
  diegoFee?: unknown;
  isCreditNote?: boolean | null;
  payStatus?: number | null;
  attachmentUrl?: string | null;
};

function creditInput(value: unknown, credit: boolean) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return String(credit ? Math.abs(n) : n);
}

function draftFromCurrent(current: PurchaseInvoiceCurrent | null | undefined, now: string): OcrFormDraft {
  const credit = Boolean(current?.isCreditNote);
  return {
    saleOrderId: "",
    vendorId: current?.vendorId ?? "",
    orderId: current?.orderId ?? "",
    clientId: "",
    invoiceIds: [],
    legalName: "",
    receiptRef: "",
    issuedAt: current?.issuedAt ?? now,
    dueAt: "",
    docType: current?.docType ?? "A",
    pos: String(current?.pos ?? 1),
    number: current?.number != null ? String(current.number) : "",
    amount: creditInput(current?.amount, credit),
    vat: creditInput(current?.vat, credit),
    detail: "",
    collected: "0",
    echeq: "0",
    bank: "0",
    retVat: "0",
    retGan: "0",
    retSuss: "0",
    retIibb: "0",
    vatWithholding: creditInput(current?.vatWithholding, credit),
    iibbCaba: creditInput(current?.iibbCaba, credit),
    iibbBsAs: creditInput(current?.iibbBsAs, credit),
    internalTax: creditInput(current?.internalTax, credit),
    nonTaxable: creditInput(current?.nonTaxable, credit),
    isCreditNote: current?.isCreditNote ? "1" : "0",
    diegoFee: erpInputNumber(current?.diegoFee),
    balance: "0",
    attachmentUrl: current?.attachmentUrl ?? "",
    payments: [],
  };
}

/** Al tocar el importe recalcula el IVA con la alícuota que ya tenía (21% si no había). */
function NetVatFields({ amount, vat }: { amount: string; vat: string }) {
  const [amountValue, setAmountValue] = useState(amount);
  const [vatValue, setVatValue] = useState(vat);
  return (
    <>
      <ErpField htmlFor="amount" label="Importe">
        <Input
          id="amount"
          name="amount"
          onChange={(e) => {
            const prevNet = parseMoney(amountValue);
            const prevVat = parseMoney(vatValue);
            const rate = prevNet > 0 && prevVat > 0 ? prevVat / prevNet : 0.21;
            setAmountValue(e.target.value);
            setVatValue(String(vatForNet(parseMoney(e.target.value), rate)));
          }}
          value={amountValue}
        />
      </ErpField>
      <ErpField htmlFor="vat" label="IVA">
        <Input id="vat" name="vat" onChange={(e) => setVatValue(e.target.value)} value={vatValue} />
      </ErpField>
    </>
  );
}

export function ErpPurchaseInvoiceFormFields({
  current,
  now,
  allowOcr,
  vendors,
  orders,
}: {
  current?: PurchaseInvoiceCurrent | null;
  now: string;
  allowOcr: boolean;
  vendors: { value: string; label: string }[];
  orders: { value: string; label: string; vendorId: string }[];
}) {
  const [draft, setDraft] = useState(() => draftFromCurrent(current, now));
  const [vendorId, setVendorId] = useState(draft.vendorId);
  const [orderId, setOrderId] = useState(draft.orderId);
  const [key, setKey] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [review, setReview] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<OcrCandidates>(EMPTY_OCR_CANDIDATES);
  const orderOptions = orders.filter((o) => o.vendorId === vendorId);
  const vendorCandidates = candidates.vendor.filter((c) => vendors.some((v) => v.value === c.id));
  const orderCandidates = candidates.purchaseOrder.filter((c) => orderOptions.some((o) => o.value === c.id));

  function applyVendor(nextVendorId: string) {
    setVendorId(nextVendorId);
    const keep = orders.some((o) => o.value === orderId && o.vendorId === nextVendorId);
    if (!keep) setOrderId("");
  }

  return (
    <>
      {current ? <input name="id" type="hidden" value={current.id} /> : null}
      <input name="isVatPurchase" type="hidden" value="0" />
      {allowOcr ? (
        <ErpOcrImport
          issuedOnly={false}
          kind="purchase_invoice"
          onResult={(result) => {
            const next = ocrDraftFromMatch(result);
            setDraft(next);
            setVendorId(next.vendorId);
            setOrderId(next.orderId);
            setWarnings(result.extracted.warnings);
            setBlockers(result.blockers);
            setReview(result.review);
            setCandidates(result.candidates);
            setKey((n) => n + 1);
          }}
        />
      ) : null}
      <ErpOcrWarnings blockers={blockers} review={review} warnings={warnings} />
      <div className="contents" key={key}>
        <ErpField htmlFor="vendorId" label="Proveedor">
          <Autocomplete
            id="vendorId"
            name="vendorId"
            onChange={applyVendor}
            options={vendors}
            placeholder="Buscar proveedor…"
            required
            value={vendorId}
          />
          {!vendorId ? <ErpOcrCandidates onPick={applyVendor} options={vendorCandidates} /> : null}
        </ErpField>
        <ErpField htmlFor="isCreditNote" label="Tipo de comprobante">
          <Select defaultValue={draft.isCreditNote} id="isCreditNote" name="isCreditNote">
            <option value="0">Factura</option>
            <option value="1">Nota de crédito</option>
          </Select>
        </ErpField>
        <ErpField htmlFor="orderId" label="Orden">
          <Autocomplete
            disabled={!vendorId}
            id="orderId"
            name="orderId"
            onChange={setOrderId}
            options={orderOptions}
            placeholder={vendorId ? "Buscar orden de este proveedor…" : "Elegí un proveedor primero"}
            required
            value={orderId}
          />
          {!orderId ? <ErpOcrCandidates onPick={setOrderId} options={orderCandidates} /> : null}
        </ErpField>
        <ErpField htmlFor="issuedAt" label="Fecha">
          <Input defaultValue={draft.issuedAt} id="issuedAt" name="issuedAt" type="date" />
        </ErpField>
        <ErpField htmlFor="docType" label="Tipo">
          <ErpDocTypeSelect defaultValue={draft.docType} />
        </ErpField>
        <ErpField htmlFor="pos" label="Punto">
          <Input defaultValue={draft.pos} id="pos" name="pos" type="number" />
        </ErpField>
        <ErpField htmlFor="number" label="Número">
          <Input defaultValue={draft.number} id="number" name="number" required type="number" />
        </ErpField>
        <NetVatFields amount={draft.amount} vat={draft.vat} />
        <ErpField htmlFor="vatWithholding" label="Ret. IVA">
          <Input defaultValue={draft.vatWithholding} id="vatWithholding" name="vatWithholding" />
        </ErpField>
        <ErpField htmlFor="iibbCaba" label="Ret. IIBB CABA">
          <Input defaultValue={draft.iibbCaba} id="iibbCaba" name="iibbCaba" />
        </ErpField>
        <ErpField htmlFor="iibbBsAs" label="Ret. IIBB Bs.As.">
          <Input defaultValue={draft.iibbBsAs} id="iibbBsAs" name="iibbBsAs" />
        </ErpField>
        <ErpField htmlFor="internalTax" label="Imp. interno">
          <Input defaultValue={draft.internalTax} id="internalTax" name="internalTax" />
        </ErpField>
        <ErpField htmlFor="nonTaxable" label="No gravado">
          <Input defaultValue={draft.nonTaxable} id="nonTaxable" name="nonTaxable" />
        </ErpField>
        <ErpField htmlFor="diegoFee" label="Com. Diego">
          <Input defaultValue={draft.diegoFee} id="diegoFee" name="diegoFee" />
        </ErpField>
        <ErpField htmlFor="payStatus" label="Pago">
          <Select defaultValue={String(current?.payStatus ?? 0)} id="payStatus" name="payStatus">
            <option value={ERP_SETTLE.pending}>Pendiente</option>
            <option value={ERP_SETTLE.paid}>Pagado</option>
          </Select>
        </ErpField>
        <ErpField htmlFor="attachmentUrl" label="Adjunto" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
      </div>
    </>
  );
}
