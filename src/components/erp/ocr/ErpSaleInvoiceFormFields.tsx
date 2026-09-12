"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { ErpOcrImport } from "@/components/erp/ocr/ErpOcrImport";
import { ErpOcrWarnings } from "@/components/erp/ocr/ErpOcrWarnings";
import { ErpSaleInvoiceLinks, type ErpReceiptOption, type ErpSaleOrderOption } from "@/components/erp/ErpSaleInvoiceLinks";
import { ERP_COLLECT, erpInputNumber } from "@/lib/erp";
import { ocrDraftFromMatch, type OcrFormDraft } from "@/lib/erp-ocr";

export type SaleInvoiceCurrent = {
  id: string;
  saleOrderId: string;
  legalName?: string | null;
  receiptRef?: string | null;
  amount: unknown;
  vat: unknown;
  issuedAt: string;
  docType?: string | null;
  pos?: number | null;
  number?: number | null;
  detail?: string | null;
  collectStatus?: number | null;
  collected?: unknown;
  echeq?: unknown;
  bank?: unknown;
  attachmentUrl?: string | null;
  retGan?: unknown;
  retVat?: unknown;
  retSuss?: unknown;
  retIibb?: unknown;
};

function draftFromCurrent(current: SaleInvoiceCurrent | null | undefined, now: string): OcrFormDraft {
  return {
    saleOrderId: current?.saleOrderId ?? "",
    vendorId: "",
    orderId: "",
    clientId: "",
    invoiceIds: [],
    legalName: current?.legalName ?? "",
    receiptRef: current?.receiptRef ?? "",
    issuedAt: current?.issuedAt ?? now,
    dueAt: "",
    docType: current?.docType ?? "A",
    pos: String(current?.pos ?? 1),
    number: current?.number != null ? String(current.number) : "",
    amount: current ? erpInputNumber(current.amount) : "",
    vat: current ? erpInputNumber(current.vat) : "",
    detail: current?.detail ?? "",
    collected: erpInputNumber(current?.collected),
    echeq: erpInputNumber(current?.echeq),
    bank: erpInputNumber(current?.bank),
    retVat: erpInputNumber(current?.retVat),
    retGan: erpInputNumber(current?.retGan),
    retSuss: erpInputNumber(current?.retSuss),
    retIibb: erpInputNumber(current?.retIibb),
    vatWithholding: "0",
    iibbCaba: "0",
    iibbBsAs: "0",
    internalTax: "0",
    nonTaxable: "0",
    isCreditNote: "0",
    diegoFee: "0",
    balance: "0",
    attachmentUrl: current?.attachmentUrl ?? "",
    payments: [],
  };
}

export function ErpSaleInvoiceFormFields({
  current,
  now,
  allowOcr,
  orders,
  receipts,
}: {
  current?: SaleInvoiceCurrent | null;
  now: string;
  allowOcr: boolean;
  orders: ErpSaleOrderOption[];
  receipts: ErpReceiptOption[];
}) {
  const [draft, setDraft] = useState(() => draftFromCurrent(current, now));
  const [key, setKey] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [blockers, setBlockers] = useState<string[]>([]);

  return (
    <>
      {current ? <input name="id" type="hidden" value={current.id} /> : null}
      {allowOcr ? (
        <ErpOcrImport
          issuedOnly={false}
          kind="sale_invoice"
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
        <ErpSaleInvoiceLinks
          defaultAmount={draft.amount || undefined}
          defaultLegalName={draft.legalName || undefined}
          defaultOrderId={draft.saleOrderId || undefined}
          defaultReceiptRef={draft.receiptRef || undefined}
          defaultVat={draft.vat || undefined}
          orders={orders}
          receipts={receipts}
        />
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
        <ErpField htmlFor="detail" label="Detalle">
          <Input defaultValue={draft.detail} id="detail" name="detail" />
        </ErpField>
        <ErpField htmlFor="collectStatus" label="Cobro">
          <Select defaultValue={String(current?.collectStatus ?? 0)} id="collectStatus" name="collectStatus">
            <option value={ERP_COLLECT.pending}>Pendiente</option>
            <option value={ERP_COLLECT.collected}>Cobrado</option>
          </Select>
        </ErpField>
        <ErpField htmlFor="collected" label="Cobrado">
          <Input defaultValue={draft.collected} id="collected" name="collected" />
        </ErpField>
        <ErpField htmlFor="echeq" label="E-cheq">
          <Input defaultValue={draft.echeq} id="echeq" name="echeq" />
        </ErpField>
        <ErpField htmlFor="bank" label="Banco / transfer">
          <Input defaultValue={draft.bank} id="bank" name="bank" />
        </ErpField>
        <ErpField htmlFor="attachmentUrl" label="Adjunto" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
        <ErpField htmlFor="retGan" label="Ret. gan.">
          <Input defaultValue={draft.retGan} id="retGan" name="retGan" />
        </ErpField>
        <ErpField htmlFor="retVat" label="Ret. IVA">
          <Input defaultValue={draft.retVat} id="retVat" name="retVat" />
        </ErpField>
        <ErpField htmlFor="retSuss" label="Ret. SUSS">
          <Input defaultValue={draft.retSuss} id="retSuss" name="retSuss" />
        </ErpField>
        <ErpField htmlFor="retIibb" label="Ret. IIBB">
          <Input defaultValue={draft.retIibb} id="retIibb" name="retIibb" />
        </ErpField>
      </div>
    </>
  );
}
