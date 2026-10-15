"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";
import { erpCashAmount, money, parseMoney } from "@/lib/erp";
import { purchaseVat } from "@/lib/erp-order-docs";

type CashInput = { mode: string; typed: string };

function vatFor(net: string, rate: string, cash: CashInput) {
  const netValue = parseMoney(net);
  const cashValue = erpCashAmount(cash.mode, netValue, parseMoney(cash.typed));
  return String(purchaseVat(netValue - cashValue, parseMoney(rate)));
}

function readCash(form: HTMLFormElement): CashInput {
  const data = new FormData(form);
  return { mode: String(data.get("cashMode") ?? ""), typed: String(data.get("cashAmount") ?? "") };
}

/**
 * Neto, alícuota, IVA y total. El IVA se recalcula al tocar el neto, la alícuota o la parte
 * en efectivo (que no lleva IVA), pero se puede pisar a mano cuando la orden trae un redondeo distinto.
 */
export function ErpVatFields({
  net: initialNet,
  vat: initialVat,
  vatRate: initialRate,
  cashMode = "",
  cashAmount = "",
  netLabel = "Neto",
}: {
  net: string;
  vat: string;
  vatRate: string;
  cashMode?: string;
  cashAmount?: string;
  netLabel?: string;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [net, setNet] = useState(initialNet);
  const [rate, setRate] = useState(initialRate || "21");
  const [cash, setCash] = useState<CashInput>({ mode: cashMode, typed: cashAmount });
  const [vat, setVat] = useState(
    initialVat || (initialNet ? vatFor(initialNet, initialRate || "21", { mode: cashMode, typed: cashAmount }) : ""),
  );
  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    const onChange = (event: Event) => {
      const name = (event.target as HTMLInputElement | null)?.name;
      if (name !== "cashMode" && name !== "cashAmount") return;
      const next = readCash(form);
      const currentNet = String(new FormData(form).get("net") ?? "");
      const currentRate = (form.elements.namedItem("vatRatePreview") as HTMLInputElement | null)?.value ?? "";
      setCash(next);
      setVat(vatFor(currentNet, currentRate, next));
    };
    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    return () => {
      form.removeEventListener("input", onChange);
      form.removeEventListener("change", onChange);
    };
  }, []);

  const netValue = parseMoney(net);
  const cashValue = erpCashAmount(cash.mode, netValue, parseMoney(cash.typed));
  const total = netValue + parseMoney(vat);

  return (
    <>
      <ErpField htmlFor="net" label={netLabel}>
        <span hidden ref={anchor} />
        <Input
          id="net"
          inputMode="decimal"
          name="net"
          onChange={(e) => {
            setNet(e.target.value);
            setVat(vatFor(e.target.value, rate, cash));
          }}
          value={net}
        />
      </ErpField>
      <ErpField htmlFor="vatRatePreview" label="IVA %">
        <Input
          id="vatRatePreview"
          inputMode="decimal"
          onChange={(e) => {
            setRate(e.target.value);
            setVat(vatFor(net, e.target.value, cash));
          }}
          placeholder="0 si no lleva IVA"
          value={rate}
        />
      </ErpField>
      <ErpField htmlFor="vat" label="IVA">
        <Input id="vat" inputMode="decimal" name="vat" onChange={(e) => setVat(e.target.value)} value={vat} />
      </ErpField>
      <ErpField htmlFor="totalPreview" label="Total">
        <Input id="totalPreview" readOnly tabIndex={-1} value={money(total)} />
      </ErpField>
      {cashValue > 0 ? (
        <>
          <ErpField htmlFor="invoicedPreview" label="Se factura (neto + IVA)">
            <Input id="invoicedPreview" readOnly tabIndex={-1} value={money(total - cashValue)} />
          </ErpField>
          <ErpField htmlFor="cashPreview" label="En efectivo">
            <Input id="cashPreview" readOnly tabIndex={-1} value={money(cashValue)} />
          </ErpField>
        </>
      ) : null}
    </>
  );
}
