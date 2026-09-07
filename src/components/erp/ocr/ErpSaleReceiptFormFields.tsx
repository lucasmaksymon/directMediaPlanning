"use client";

import { useState } from "react";
import { Autocomplete, Input } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { ErpOcrImport } from "@/components/erp/ocr/ErpOcrImport";
import { ErpOcrWarnings } from "@/components/erp/ocr/ErpOcrWarnings";
import {
  ERP_CHECK_MODE,
  ERP_CHECK_ORDER,
  ERP_CHECK_TYPE,
  ERP_PAY_SALE,
  ERP_PAY_SALE_STATUS,
  erpInputNumber,
  selectOptions,
} from "@/lib/erp";
import { ocrDraftFromMatch, type OcrFormDraft } from "@/lib/erp-ocr";

export type SaleReceiptCurrent = {
  id: string;
  clientId: string;
  number?: number | null;
  issuedAt: string;
  amount?: unknown;
  balance?: unknown;
  attachmentUrl?: string | null;
  invoiceIds: string[];
  payments: Array<{
    id: string;
    values: Record<string, string>;
  }>;
};

function draftFromCurrent(current: SaleReceiptCurrent | null | undefined, now: string): OcrFormDraft {
  return {
    saleOrderId: "",
    vendorId: "",
    orderId: "",
    clientId: current?.clientId ?? "",
    invoiceIds: current?.invoiceIds ?? [],
    legalName: "",
    receiptRef: "",
    issuedAt: current?.issuedAt ?? now,
    dueAt: "",
    docType: "X",
    pos: "1",
    number: current?.number != null ? String(current.number) : "",
    amount: erpInputNumber(current?.amount),
    vat: "0",
    detail: "",
    collected: "0",
    echeq: "0",
    bank: "0",
    retVat: "0",
    retGan: "0",
    retSuss: "0",
    retIibb: "0",
    vatWithholding: "0",
    iibbCaba: "0",
    iibbBsAs: "0",
    internalTax: "0",
    nonTaxable: "0",
    isCreditNote: "0",
    diegoFee: "0",
    balance: erpInputNumber(current?.balance),
    attachmentUrl: current?.attachmentUrl ?? "",
    payments: [],
  };
}

const PAY_FIELDS = [
  { name: "paymentKind", label: "Tipo pago", options: selectOptions(ERP_PAY_SALE) },
  { name: "number", label: "Número" },
  { name: "issuedAt", label: "Fecha emisión", type: "date" as const },
  { name: "paidAt", label: "Fecha de pago", type: "date" as const },
  { name: "checkOrder", label: "Orden cheque", options: selectOptions(ERP_CHECK_ORDER) },
  { name: "checkType", label: "Tipo cheque", options: selectOptions(ERP_CHECK_TYPE) },
  { name: "checkMode", label: "Modo cheque", options: selectOptions(ERP_CHECK_MODE) },
  { name: "amount", label: "Importe", type: "number" as const },
  { name: "estado", label: "Estado", options: selectOptions(ERP_PAY_SALE_STATUS) },
  { name: "attachmentUrl", label: "Recibo de pago", type: "file" as const, wide: true },
];

export function ErpSaleReceiptFormFields({
  current,
  now,
  allowOcr,
  clients,
  invoices,
}: {
  current?: SaleReceiptCurrent | null;
  now: string;
  allowOcr: boolean;
  clients: { value: string; label: string }[];
  invoices: { value: string; label: string }[];
}) {
  const [draft, setDraft] = useState(() => draftFromCurrent(current, now));
  const [key, setKey] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [blockers, setBlockers] = useState<string[]>([]);

  const paymentRows =
    draft.payments.length > 0
      ? draft.payments.map((line) => ({ values: line }))
      : current?.payments ?? [];

  return (
    <>
      {current ? <input name="id" type="hidden" value={current.id} /> : null}
      {allowOcr ? (
        <ErpOcrImport
          kind="sale_receipt"
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
        <ErpField htmlFor="clientId" label="Cliente">
          <Autocomplete
            defaultValue={draft.clientId}
            id="clientId"
            name="clientId"
            options={clients}
            placeholder="Buscar cliente…"
            required
          />
        </ErpField>
        <ErpField htmlFor="number" label="Número">
          <Input defaultValue={draft.number} id="number" name="number" required type="number" />
        </ErpField>
        <ErpField htmlFor="issuedAt" label="Fecha">
          <Input defaultValue={draft.issuedAt} id="issuedAt" name="issuedAt" type="date" />
        </ErpField>
        <ErpField htmlFor="amount" label="Importe">
          <Input defaultValue={draft.amount} id="amount" name="amount" />
        </ErpField>
        <ErpField htmlFor="balance" label="Saldo">
          <Input defaultValue={draft.balance} id="balance" name="balance" />
        </ErpField>
        <ErpField htmlFor="invoiceId" label="Facturas" wide>
          <Autocomplete
            defaultValue={draft.invoiceIds}
            emptyLabel="Sin facturas"
            id="invoiceId"
            multiple
            name="invoiceId"
            options={invoices}
            placeholder="Buscar factura…"
          />
        </ErpField>
        <ErpField htmlFor="attachmentUrl" label="Adjunto" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
        <ErpLineList
          addLabel="Agregar pago"
          fields={PAY_FIELDS}
          prefix="py"
          rows={paymentRows}
          title="Pagos recibidos"
        />
      </div>
    </>
  );
}
