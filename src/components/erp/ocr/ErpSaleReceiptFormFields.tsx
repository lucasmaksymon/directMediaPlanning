"use client";

import { useState } from "react";
import { Autocomplete, Input } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList, type ErpLineRow } from "@/components/erp/ErpLineList";
import { ErpChequeExcelImport } from "@/components/erp/ocr/ErpChequeExcelImport";
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
import { ErpOcrCandidates } from "@/components/erp/ocr/ErpOcrCandidates";
import { EMPTY_OCR_CANDIDATES, ocrDraftFromMatch, type OcrCandidates, type OcrFormDraft } from "@/lib/erp-ocr";

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
  const [review, setReview] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<OcrCandidates>(EMPTY_OCR_CANDIDATES);
  const [clientId, setClientId] = useState(draft.clientId);
  const [invoiceIds, setInvoiceIds] = useState<string[]>(draft.invoiceIds);
  const [paymentRows, setPaymentRows] = useState<ErpLineRow[]>(() => current?.payments ?? []);
  const [linesKey, setLinesKey] = useState(0);
  const [chequeNotes, setChequeNotes] = useState<string[]>([]);
  const invoiceCandidates = candidates.invoices.filter((c) => invoices.some((i) => i.value === c.id));

  return (
    <>
      {current ? <input name="id" type="hidden" value={current.id} /> : null}
      {allowOcr ? (
        <ErpOcrImport
          kind="sale_receipt"
          onResult={(result) => {
            const next = ocrDraftFromMatch(result);
            setDraft(next);
            setClientId(next.clientId);
            setInvoiceIds(next.invoiceIds);
            setPaymentRows(next.payments.map((line) => ({ values: line })));
            setChequeNotes([]);
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
        <ErpField htmlFor="clientId" label="Cliente">
          <Autocomplete
            id="clientId"
            name="clientId"
            onChange={setClientId}
            options={clients}
            placeholder="Buscar cliente…"
            required
            value={clientId}
          />
          {!clientId ? (
            <ErpOcrCandidates
              onPick={setClientId}
              options={candidates.client.filter((c) => clients.some((cl) => cl.value === c.id))}
            />
          ) : null}
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
            emptyLabel="Sin facturas"
            id="invoiceId"
            multiple
            name="invoiceId"
            onChange={setInvoiceIds}
            options={invoices}
            placeholder="Buscar factura…"
            value={invoiceIds}
          />
          <ErpOcrCandidates
            onPick={(id) => setInvoiceIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
            options={invoiceCandidates}
            selected={invoiceIds}
          />
        </ErpField>
        <ErpField htmlFor="attachmentUrl" label="Adjunto" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
        <ErpChequeExcelImport
          clientId={clientId}
          fields={PAY_FIELDS.map((f) => f.name)}
          onLines={(rows, notes) => {
            setPaymentRows(rows);
            setChequeNotes(notes);
            setLinesKey((n) => n + 1);
          }}
          prefix="py"
          receiptId={current?.id}
        />
        <ErpOcrWarnings warnings={chequeNotes} />
        <ErpLineList
          addLabel="Agregar pago"
          fields={PAY_FIELDS}
          key={linesKey}
          prefix="py"
          rows={paymentRows}
          title="Pagos recibidos"
        />
      </div>
    </>
  );
}
