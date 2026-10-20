"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Input } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";
import { ErpOcrCandidates } from "@/components/erp/ocr/ErpOcrCandidates";
import { erpInputNumber, money, parseMoney } from "@/lib/erp";
import type { OcrMatchOption } from "@/lib/erp-ocr";
import { vatForNet } from "@/lib/erp-ocr-score";

export type ErpSaleOrderOption = {
  id: string;
  label: string;
  clientId: string;
  legalName: string;
  net: number;
  vat: number;
  /** IVA / neto de la orden (0,21 si no se puede calcular). */
  vatRate: number;
  remainingNet: number;
  remainingVat: number;
  remainingAmount: number;
  invoicedAmount: number;
  orderAmount: number;
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
  candidates = [],
}: {
  orders: ErpSaleOrderOption[];
  receipts: ErpReceiptOption[];
  defaultOrderId?: string;
  defaultLegalName?: string | null;
  defaultReceiptRef?: string | null;
  defaultAmount?: number | string | null;
  defaultVat?: number | string | null;
  /** Órdenes sugeridas por el OCR cuando no eligió ninguna con seguridad. */
  candidates?: OcrMatchOption[];
}) {
  const hasDefaultAmount = defaultAmount != null && defaultAmount !== "";
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");
  const selected = orders.find((o) => o.id === orderId);
  const [legalName, setLegalName] = useState(defaultLegalName || selected?.legalName || "");
  // Importes del PDF, de la factura en edición o tipeados: no se pisan al cambiar la orden.
  const [amountLocked, setAmountLocked] = useState(hasDefaultAmount);
  const [amount, setAmount] = useState(
    hasDefaultAmount ? erpInputNumber(defaultAmount) : selected ? erpInputNumber(selected.remainingNet) : "0",
  );
  const [vat, setVat] = useState(
    defaultVat != null && defaultVat !== ""
      ? erpInputNumber(defaultVat)
      : selected && !hasDefaultAmount
        ? erpInputNumber(selected.remainingVat)
        : "0",
  );
  const clientReceipts = useMemo(
    () => (selected ? receipts.filter((r) => r.clientId === selected.clientId) : receipts),
    [receipts, selected],
  );
  const receiptValue = defaultReceiptRef ?? "";
  const receiptKnown = clientReceipts.some((r) => r.ref === receiptValue);
  const openCandidates = candidates.filter((c) => orders.some((o) => o.id === c.id));

  function pickOrder(id: string) {
    setOrderId(id);
    const next = orders.find((o) => o.id === id);
    if (!next) return;
    setLegalName(next.legalName);
    if (!amountLocked) {
      setAmount(erpInputNumber(next.remainingNet));
      setVat(erpInputNumber(next.remainingVat));
    }
  }

  return (
    <>
      <ErpField htmlFor="saleOrderId" label="O.P. venta">
        <Autocomplete
          id="saleOrderId"
          name="saleOrderId"
          onChange={pickOrder}
          options={orders.map((o) => ({ value: o.id, label: o.label }))}
          placeholder="Buscar orden…"
          required
          value={orderId}
        />
        {!orderId ? <ErpOcrCandidates onPick={pickOrder} options={openCandidates} /> : null}
        {selected && selected.invoicedAmount > 0.009 ? (
          <p className="text-xs text-muted-foreground">
            {selected.remainingAmount > 0.009
              ? `Ya facturado ${money(selected.invoicedAmount)} de ${money(selected.orderAmount)}. Resta ${money(selected.remainingAmount)}.`
              : `Ya facturado ${money(selected.invoicedAmount)} de ${money(selected.orderAmount)}. El total ya está cubierto.`}
          </p>
        ) : null}
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
          onChange={(e) => {
            setAmountLocked(true);
            setAmount(e.target.value);
            setVat(String(vatForNet(parseMoney(e.target.value), selected?.vatRate ?? 0.21)));
          }}
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
