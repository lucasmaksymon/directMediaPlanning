"use client";

import { useState } from "react";
import { Autocomplete, Input } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpDocTypeSelect } from "@/components/erp/ErpDocTypeSelect";
import { ErpVatCommissionFields } from "@/components/erp/ErpVatCommissionFields";
import { ErpOcrImport } from "@/components/erp/ocr/ErpOcrImport";
import { ErpOcrWarnings } from "@/components/erp/ocr/ErpOcrWarnings";
import { erpInputNumber, vatPurchaseCommission } from "@/lib/erp";
import { ocrDraftFromMatch } from "@/lib/erp-ocr";

export type VatPurchaseCurrent = {
  id: string;
  vendorId: string;
  orderId: string;
  issuedAt: string;
  docType?: string | null;
  pos?: number | null;
  number?: number | null;
  amount?: unknown;
  vat?: unknown;
  commission?: unknown;
  attachmentUrl?: string | null;
};

type Draft = {
  vendorId: string;
  orderId: string;
  issuedAt: string;
  docType: string;
  pos: string;
  number: string;
  amount: string;
  vat: string;
  commission: string;
  attachmentUrl: string;
};

function draftFromCurrent(current: VatPurchaseCurrent | null | undefined, now: string): Draft {
  return {
    vendorId: current?.vendorId ?? "",
    orderId: current?.orderId ?? "",
    issuedAt: current?.issuedAt ?? now,
    docType: current?.docType ?? "A",
    pos: String(current?.pos ?? 1),
    number: current?.number != null ? String(current.number) : "",
    amount: erpInputNumber(current?.amount),
    vat: erpInputNumber(current?.vat),
    commission: erpInputNumber(current?.commission),
    attachmentUrl: current?.attachmentUrl ?? "",
  };
}

export function ErpVatPurchaseFormFields({
  current,
  now,
  allowOcr,
  vendors,
  orders,
}: {
  current?: VatPurchaseCurrent | null;
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
      <input name="isVatPurchase" type="hidden" value="1" />
      {allowOcr ? (
        <ErpOcrImport
          issuedOnly={false}
          kind="purchase_invoice"
          vatPurchase
          onResult={(result) => {
            const next = ocrDraftFromMatch(result);
            setDraft({
              vendorId: next.vendorId,
              orderId: orders.some((o) => o.value === next.orderId) ? next.orderId : "",
              issuedAt: next.issuedAt || now,
              docType: next.docType || "A",
              pos: next.pos || "1",
              number: next.number,
              amount: next.amount,
              vat: next.vat,
              commission: String(vatPurchaseCommission(Number(next.amount) || 0)),
              attachmentUrl: next.attachmentUrl,
            });
            setWarnings(result.extracted.warnings);
            setBlockers(result.blockers.filter((b) => !/orden/i.test(b)));
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
        <ErpField htmlFor="orderId" label="Orden de compra o producción">
          <Autocomplete
            defaultValue={draft.orderId}
            id="orderId"
            name="orderId"
            options={orders}
            placeholder="Opcional"
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
        <ErpVatCommissionFields amount={draft.amount} commission={draft.commission} vat={draft.vat} />
        <ErpField htmlFor="attachmentUrl" label="Adjunto" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
      </div>
    </>
  );
}
