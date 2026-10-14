"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";
import { money, parseMoney } from "@/lib/erp";
import { purchaseVat } from "@/lib/erp-order-docs";

function vatFor(net: string, rate: string) {
  return String(purchaseVat(parseMoney(net), parseMoney(rate)));
}

/**
 * Neto, alícuota, IVA y total. El IVA se recalcula al tocar el neto o la alícuota,
 * pero se puede pisar a mano cuando la orden trae un redondeo distinto.
 */
export function ErpVatFields({
  net: initialNet,
  vat: initialVat,
  vatRate: initialRate,
  netLabel = "Neto",
}: {
  net: string;
  vat: string;
  vatRate: string;
  netLabel?: string;
}) {
  const [net, setNet] = useState(initialNet);
  const [rate, setRate] = useState(initialRate || "21");
  const [vat, setVat] = useState(initialVat || (initialNet ? vatFor(initialNet, initialRate || "21") : ""));
  const total = parseMoney(net) + parseMoney(vat);

  return (
    <>
      <ErpField htmlFor="net" label={netLabel}>
        <Input
          id="net"
          inputMode="decimal"
          name="net"
          onChange={(e) => {
            setNet(e.target.value);
            setVat(vatFor(e.target.value, rate));
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
            setVat(vatFor(net, e.target.value));
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
    </>
  );
}
