"use client";

import { useMemo, useState } from "react";
import { Input, Select } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";

export type ErpSaleOrderOption = {
  id: string;
  label: string;
  clientId: string;
  legalName: string;
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
}: {
  orders: ErpSaleOrderOption[];
  receipts: ErpReceiptOption[];
  defaultOrderId?: string;
  defaultLegalName?: string | null;
  defaultReceiptRef?: string | null;
}) {
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");
  const selected = orders.find((o) => o.id === orderId);
  const [legalName, setLegalName] = useState(defaultLegalName || selected?.legalName || "");
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
            if (next) setLegalName(next.legalName);
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
    </>
  );
}
