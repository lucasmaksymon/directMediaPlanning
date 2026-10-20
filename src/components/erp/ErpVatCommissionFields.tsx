"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";
import { parseMoney, VAT_PURCHASE_COMMISSION_PCT, vatPurchaseCommission } from "@/lib/erp";
import { vatForNet } from "@/lib/erp-ocr-score";

function suggestedCommission(amount: string, rate: string, surcharge: string) {
  return String(vatPurchaseCommission(parseMoney(amount), parseMoney(rate) + parseMoney(surcharge)));
}

/** Comisión de compra IVA: 10,5% del neto, más un recargo editable. Se guarda el importe final. */
export function ErpVatCommissionFields({
  amount,
  vat,
  commission,
}: {
  amount: string;
  vat: string;
  commission: string;
}) {
  const [amountValue, setAmountValue] = useState(amount);
  const [vatValue, setVatValue] = useState(vat);
  const [rate, setRate] = useState(String(VAT_PURCHASE_COMMISSION_PCT));
  const [surcharge, setSurcharge] = useState("0");
  const [commissionValue, setCommissionValue] = useState(commission);

  function refresh(next: { amount?: string; vat?: string; rate?: string; surcharge?: string }) {
    const amountNext = next.amount ?? amountValue;
    const vatNext = next.vat ?? vatValue;
    const rateNext = next.rate ?? rate;
    const surchargeNext = next.surcharge ?? surcharge;
    if (next.amount != null) setAmountValue(amountNext);
    if (next.vat != null) setVatValue(vatNext);
    if (next.rate != null) setRate(rateNext);
    if (next.surcharge != null) setSurcharge(surchargeNext);
    setCommissionValue(suggestedCommission(amountNext, rateNext, surchargeNext));
  }

  return (
    <>
      <ErpField htmlFor="amount" label="Importe">
        <Input
          id="amount"
          name="amount"
          onChange={(e) => {
            const net = parseMoney(e.target.value);
            const prevNet = parseMoney(amountValue);
            const prevVat = parseMoney(vatValue);
            const rate = prevNet > 0 && prevVat > 0 ? prevVat / prevNet : 0.21;
            refresh({ amount: e.target.value, vat: String(vatForNet(net, rate)) });
          }}
          value={amountValue}
        />
      </ErpField>
      <ErpField htmlFor="vat" label="IVA">
        <Input id="vat" name="vat" onChange={(e) => refresh({ vat: e.target.value })} value={vatValue} />
      </ErpField>
      <ErpField htmlFor="commissionRate" label="Comisión %">
        <Input id="commissionRate" onChange={(e) => refresh({ rate: e.target.value })} value={rate} />
      </ErpField>
      <ErpField htmlFor="commissionSurcharge" label="Recargo %">
        <Input
          id="commissionSurcharge"
          onChange={(e) => refresh({ surcharge: e.target.value })}
          title="Recargo extra, por ejemplo 2 si se paga con cheque"
          value={surcharge}
        />
      </ErpField>
      <ErpField htmlFor="commission" label="Comisión">
        <Input
          id="commission"
          name="commission"
          onChange={(e) => setCommissionValue(e.target.value)}
          value={commissionValue}
        />
      </ErpField>
    </>
  );
}
