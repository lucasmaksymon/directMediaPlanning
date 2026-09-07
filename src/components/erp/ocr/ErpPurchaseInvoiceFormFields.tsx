"use client";

import { useState } from "react";
import { Autocomplete, Input, Select } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { ErpOcrImport } from "@/components/erp/ocr/ErpOcrImport";
import { ErpOcrWarnings } from "@/components/erp/ocr/ErpOcrWarnings";
import { ERP_SETTLE, erpInputNumber } from "@/lib/erp";
import { ocrDraftFromMatch, type OcrFormDraft } from "@/lib/erp-ocr";

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

function draftFromCurrent(current: PurchaseInvoiceCurrent | null | undefined, now: string): OcrFormDraft {
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
    amount: erpInputNumber(current?.amount),
    vat: erpInputNumber(current?.vat),
    detail: "",
    collected: "0",
    echeq: "0",
    bank: "0",
    retVat: "0",
    retGan: "0",
    retSuss: "0",
    retIibb: "0",
    vatWithholding: erpInputNumber(current?.vatWithholding),
    iibbCaba: erpInputNumber(current?.iibbCaba),
    iibbBsAs: erpInputNumber(current?.iibbBsAs),
    internalTax: erpInputNumber(current?.internalTax),
    nonTaxable: erpInputNumber(current?.nonTaxable),
    isCreditNote: current?.isCreditNote ? "1" : "0",
    diegoFee: erpInputNumber(current?.diegoFee),
    balance: "0",
    attachmentUrl: current?.attachmentUrl ?? "",
    payments: [],
  };
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
  orders: { value: string; label: string }[];
}) {
  const [draft, setDraft] = useState(() => draftFromCurrent(current, now));
  const [key, setKey] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [blockers, setBlockers] = useState<string[]>([]);

  return (
    <>
      {current ? <input name="id" type="hidden" value={current.id} /> : null}
      <input name="isVatPurchase" type="hidden" value="0" />
      {allowOcr ? (
        <ErpOcrImport
          kind="purchase_invoice"
          onResult={(result) => {
            setDraft(ocrDraftFromMatch(result));
            setWarnings(result.extracted.warnings);
            setBlockers(result.blockers);
            setKey((n) => n + 1);
          }}
        />
      ) : null}
      <ErpOcrWarnings blockers={blockers} warnings={warnings} />
      <div className="contents" key={key}>
        <ErpField htmlFor="vendorId" label="Proveedor">
          <Autocomplete
            defaultValue={draft.vendorId}
            id="vendorId"
            name="vendorId"
            options={vendors}
            placeholder="Buscar proveedor…"
            required
          />
        </ErpField>
        <ErpField htmlFor="orderId" label="Orden emitida">
          <Autocomplete
            defaultValue={draft.orderId}
            id="orderId"
            name="orderId"
            options={orders}
            placeholder="Buscar orden…"
            required
          />
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
        <ErpField htmlFor="amount" label="Importe">
          <Input defaultValue={draft.amount} id="amount" name="amount" />
        </ErpField>
        <ErpField htmlFor="vat" label="IVA">
          <Input defaultValue={draft.vat} id="vat" name="vat" />
        </ErpField>
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
        <ErpField htmlFor="isCreditNote" label="Tipo de comprobante">
          <Select defaultValue={draft.isCreditNote} id="isCreditNote" name="isCreditNote">
            <option value="0">Factura</option>
            <option value="1">Nota de crédito</option>
          </Select>
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
