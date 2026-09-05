"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Input } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";
import { erpInputNumber } from "@/lib/erp";

export type ErpSaleOrderOption = {
  id: string;
  label: string;
  clientId: string;
  legalName: string;
  net: number;
  vat: number;
};

export type ErpReceiptOption = {
  clientId: string;
  ref: string;
  label: string;
};

export function ErpSaleInvoiceLinks({
  orders,
  receipts,
  defaultOrderId,
  defaultLegalName,
  defaultReceiptRef,
  defaultAmount,
  defaultVat,
}: {
  orders: ErpSaleOrderOption[];
  receipts: ErpReceiptOption[];
  defaultOrderId?: string;
  defaultLegalName?: string | null;
  defaultReceiptRef?: string | null;
  defaultAmount?: number | string | null;
  defaultVat?: number | string | null;
}) {
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");
  const selected = orders.find((o) => o.id === orderId);
  const [legalName, setLegalName] = useState(defaultLegalName || selected?.legalName || "");
  const [amount, setAmount] = useState(
    defaultAmount != null && defaultAmount !== "" ? erpInputNumber(defaultAmount) : selected ? erpInputNumber(selected.net) : "0",
  );
  const [vat, setVat] = useState(
    defaultVat != null && defaultVat !== "" ? erpInputNumber(defaultVat) : selected ? erpInputNumber(selected.vat) : "0",
  );
  const clientReceipts = useMemo(
    () => (selected ? receipts.filter((r) => r.clientId === selected.clientId) : receipts),
    [receipts, selected],
  );
  const receiptValue = defaultReceiptRef ?? "";
  const receiptKnown = clientReceipts.some((r) => r.ref === receiptValue);

  return (
    <>
      <ErpField htmlFor="saleOrderId" label="O.P. venta (emitida)">
        <Autocomplete
          id="saleOrderId"
          name="saleOrderId"
          onChange={(id) => {
            setOrderId(id);
            const next = orders.find((o) => o.id === id);
            if (next) {
              setLegalName(next.legalName);
              setAmount(erpInputNumber(next.net));
              setVat(erpInputNumber(next.vat));
            }
          }}
          options={orders.map((o) => ({ value: o.id, label: o.label }))}
          placeholder="Buscar orden…"
          required
          value={orderId}
        />
      </ErpField>
      <ErpField htmlFor="legalName" label="Factura A (razón social)">
        <Input
          id="legalName"
          name="legalName"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
        />
      </ErpField>
      <ErpField htmlFor="receiptRef" label="Recibo">
        <Autocomplete
          defaultValue={orderId === (defaultOrderId ?? "") ? receiptValue : ""}
          emptyLabel="Sin recibo"
          id="receiptRef"
          key={orderId}
          name="receiptRef"
          options={[
            ...clientReceipts.map((r) => ({ value: r.ref, label: r.label })),
            ...(receiptValue && !receiptKnown ? [{ value: receiptValue, label: receiptValue }] : []),
          ]}
          placeholder="Buscar recibo…"
        />
      </ErpField>
      <ErpField htmlFor="amount" label="Importe">
        <Input
          id="amount"
          inputMode="decimal"
          name="amount"
          onChange={(e) => setAmount(e.target.value)}
          value={amount}
        />
      </ErpField>
      <ErpField htmlFor="vat" label="IVA">
        <Input
          id="vat"
          inputMode="decimal"
          name="vat"
          onChange={(e) => setVat(e.target.value)}
          value={vat}
        />
      </ErpField>
    </>
  );
}
