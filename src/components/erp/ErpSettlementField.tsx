"use client";

import { useState } from "react";
import { Input, Radio } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";
import { ERP_CASH_MODE, type ErpCashMode } from "@/lib/erp";

const OPTIONS: { value: ErpCashMode; label: string }[] = [
  { value: ERP_CASH_MODE.invoice, label: "Con factura" },
  { value: ERP_CASH_MODE.cash, label: "Pago efectivo" },
  { value: ERP_CASH_MODE.mixed, label: "Factura + efectivo" },
];

/** El efectivo es parte del neto y no lleva IVA; el resto se factura. */
export function ErpSettlementField({
  cashMode = ERP_CASH_MODE.invoice,
  cashAmount = "",
}: {
  cashMode?: ErpCashMode;
  cashAmount?: string;
}) {
  const [mode, setMode] = useState<ErpCashMode>(cashMode);

  return (
    <>
      <ErpField htmlFor={`cashMode-${OPTIONS[0].value}`} label="Condición" wide>
        <div className="flex flex-wrap items-center gap-5 pt-1">
          {OPTIONS.map((option) => (
            <label className="flex items-center gap-2 text-sm" key={option.value}>
              <Radio
                checked={mode === option.value}
                id={`cashMode-${option.value}`}
                name="cashMode"
                onChange={() => setMode(option.value)}
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
      </ErpField>
      {mode === ERP_CASH_MODE.mixed ? (
        <ErpField htmlFor="cashAmount" label="Importe en efectivo (neto, sin IVA)">
          <Input
            defaultValue={cashAmount}
            id="cashAmount"
            inputMode="decimal"
            name="cashAmount"
            placeholder="Lo que no se factura"
            required
          />
        </ErpField>
      ) : null}
    </>
  );
}
