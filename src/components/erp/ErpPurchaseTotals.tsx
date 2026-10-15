"use client";

import { useEffect, useRef, useState } from "react";
import { erpCashAmount, money, parseMoney } from "@/lib/erp";
import { purchaseBreakdown, purchaseVat } from "@/lib/erp-order-docs";

type Totals = { gross: number; net: number; cash: number; vat: number };

function readTotals(form: HTMLFormElement): Totals {
  const data = new FormData(form);
  const items = data
    .getAll("po.net")
    .map((value, i) => ({ element: String(data.getAll("po.element")[i] ?? ""), net: parseMoney(String(value)) }))
    .filter((line) => line.element);
  const labels = data.getAll("aj.label").map(String);
  const kinds = data.getAll("aj.kind").map(String);
  const percents = data.getAll("aj.percent").map(String);
  const amounts = data.getAll("aj.amount").map(String);
  const adjustments = labels
    .map((label, i) => ({
      label,
      kind: Number(kinds[i]) || 1,
      percent: percents[i]?.trim() ? parseMoney(percents[i]) : null,
      amount: parseMoney(amounts[i]),
    }))
    .filter((adj) => adj.label);
  const { gross, net } = purchaseBreakdown({
    grossNet: parseMoney(String(data.get("grossNet") ?? "")),
    items,
    adjustments,
  });
  const cash = erpCashAmount(
    String(data.get("cashMode") ?? ""),
    net,
    parseMoney(String(data.get("cashAmount") ?? "")),
  );
  return { gross, net, cash, vat: purchaseVat(net - cash, parseMoney(String(data.get("vatRate") ?? ""))) };
}

/** Vista previa del cierre de la O.P. de compra; el servidor recalcula lo mismo al guardar. */
export function ErpPurchaseTotals() {
  const ref = useRef<HTMLDivElement>(null);
  const [totals, setTotals] = useState<Totals>({ gross: 0, net: 0, cash: 0, vat: 0 });

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let frame = 0;
    const recalc = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setTotals(readTotals(form)));
    };
    recalc();
    form.addEventListener("input", recalc);
    form.addEventListener("change", recalc);
    const observer = new MutationObserver(recalc);
    observer.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
    return () => {
      cancelAnimationFrame(frame);
      form.removeEventListener("input", recalc);
      form.removeEventListener("change", recalc);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="sm:col-span-2 xl:col-span-4 grid grid-cols-2 gap-2 rounded-md border border-border/70 bg-background/40 p-2 text-sm sm:grid-cols-4"
      ref={ref}
    >
      {[
        ["Bruto", totals.gross],
        ["Neto", totals.net],
        ["IVA", totals.vat],
        ["Total", totals.net + totals.vat],
        ...(totals.cash > 0
          ? [
              ["Se factura (neto + IVA)", totals.net - totals.cash + totals.vat],
              ["En efectivo", totals.cash],
            ]
          : []),
      ].map(([label, value]) => (
        <div key={label as string}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-semibold tabular-nums">{money(value as number)}</p>
        </div>
      ))}
    </div>
  );
}
