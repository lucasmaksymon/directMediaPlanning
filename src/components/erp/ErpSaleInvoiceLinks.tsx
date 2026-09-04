"use client";

import { useMemo, useState } from "react";
import { Input, Select } from "@/components/ui";
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
        <Select
          id="saleOrderId"
          name="saleOrderId"
          required
          value={orderId}
          onChange={(e) => {
            const id = e.target.value;
            setOrderId(id);
            const next = orders.find((o) => o.id === id);
            if (next) {
              setLegalName(next.legalName);
              setAmount(erpInputNumber(next.net));
              setVat(erpInputNumber(next.vat));
            }
          }}
        >
          <option value="">Seleccioná</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
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
        <Select
          defaultValue={orderId === (defaultOrderId ?? "") ? receiptValue : ""}
          id="receiptRef"
          key={orderId}
          name="receiptRef"
        >
          <option value="">Sin recibo</option>
          {clientReceipts.map((r) => (
            <option key={`${r.clientId}-${r.ref}`} value={r.ref}>
              {r.label}
            </option>
          ))}
          {receiptValue && !receiptKnown ? <option value={receiptValue}>{receiptValue}</option> : null}
        </Select>
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
