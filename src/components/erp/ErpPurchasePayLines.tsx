"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Autocomplete, Button, IconButton, Input } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import {
  ERP_CHECK_MODE,
  ERP_CHECK_ORDER,
  ERP_CHECK_TYPE,
  ERP_PAY_PURCHASE,
  ERP_PAY_PURCHASE_KIND,
  ERP_PAY_PURCHASE_STATUS,
  selectOptions,
} from "@/lib/erp";

export type EndorsableCheque = {
  id: string;
  number: string;
  label: string;
  issuedAt: string;
  paidAt: string;
  checkOrder: string;
  checkType: string;
  checkMode: string;
  amount: string;
};

type LineValues = {
  paymentKind: string;
  number: string;
  endorsedFromId: string;
  issuedAt: string;
  paidAt: string;
  checkOrder: string;
  checkType: string;
  checkMode: string;
  amount: string;
  estado: string;
  attachmentUrl: string;
};

const EMPTY: LineValues = {
  paymentKind: String(ERP_PAY_PURCHASE_KIND.transfer),
  number: "",
  endorsedFromId: "",
  issuedAt: "",
  paidAt: "",
  checkOrder: "0",
  checkType: "0",
  checkMode: "0",
  amount: "",
  estado: "0",
  attachmentUrl: "",
};

let lineKey = 0;
function nextKey() {
  lineKey += 1;
  return `pay-${lineKey}`;
}

export function ErpPurchasePayLines({
  cheques,
  rows = [],
}: {
  cheques: EndorsableCheque[];
  rows?: Array<{ id?: string; values: Partial<LineValues> }>;
}) {
  const [lines, setLines] = useState(() =>
    rows.length
      ? rows.map((row) => ({ key: nextKey(), id: row.id ?? "", values: { ...EMPTY, ...row.values } }))
      : [{ key: nextKey(), id: "", values: { ...EMPTY } }],
  );
  const byId = new Map(cheques.map((c) => [c.id, c]));

  function patch(key: string, next: Partial<LineValues>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, values: { ...line.values, ...next } } : line)),
    );
  }

  return (
    <div className="sm:col-span-2 xl:col-span-4 space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagos efectuados</h3>
        <Button
          onClick={() => setLines((prev) => [...prev, { key: nextKey(), id: "", values: { ...EMPTY } }])}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="size-3.5" />
          Agregar pago
        </Button>
      </div>
      <div className="space-y-2">
        {lines.map((line) => {
          const endorsed = line.values.paymentKind === String(ERP_PAY_PURCHASE_KIND.endorsed);
          return (
            <div
              className="relative grid items-end gap-2 rounded-md border border-border/70 bg-background/40 p-2 pr-10 sm:grid-cols-2 lg:grid-cols-4"
              key={line.key}
            >
              <IconButton
                className="absolute right-1.5 top-1.5"
                disabled={lines.length <= 1}
                label="Quitar línea"
                onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== line.key)))}
                size="icon-sm"
              >
                <Trash2 className="size-3.5" />
              </IconButton>
              <input name="py.id" type="hidden" value={line.id} />
              <input name="py.endorsedFromId" type="hidden" value={endorsed ? line.values.endorsedFromId : ""} />
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Tipo pago</span>
                <Autocomplete
                  compact
                  onChange={(value) =>
                    patch(line.key, {
                      paymentKind: value,
                      endorsedFromId: value === String(ERP_PAY_PURCHASE_KIND.endorsed) ? line.values.endorsedFromId : "",
                    })
                  }
                  options={selectOptions(ERP_PAY_PURCHASE)}
                  placeholder="Buscar tipo…"
                  value={line.values.paymentKind}
                />
                <input name="py.paymentKind" type="hidden" value={line.values.paymentKind} />
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Número</span>
                {endorsed ? (
                  <Autocomplete
                    compact
                    emptyLabel="Seleccioná cheque"
                    onChange={(value) => {
                      const cheque = byId.get(value);
                      patch(line.key, {
                        endorsedFromId: value,
                        number: cheque?.number ?? "",
                        issuedAt: cheque?.issuedAt ?? "",
                        paidAt: cheque?.paidAt ?? "",
                        checkOrder: cheque?.checkOrder ?? "0",
                        checkType: cheque?.checkType ?? "0",
                        checkMode: cheque?.checkMode ?? "0",
                        amount: cheque?.amount ?? line.values.amount,
                      });
                    }}
                    options={cheques.map((c) => ({ value: c.id, label: c.label }))}
                    placeholder="Cheque disponible…"
                    value={line.values.endorsedFromId}
                  />
                ) : (
                  <Input
                    name="py.number"
                    onChange={(e) => patch(line.key, { number: e.target.value })}
                    value={line.values.number}
                  />
                )}
                {endorsed ? <input name="py.number" type="hidden" value={line.values.number} /> : null}
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Fecha emisión</span>
                <Input
                  name="py.issuedAt"
                  onChange={(e) => patch(line.key, { issuedAt: e.target.value })}
                  type="date"
                  value={line.values.issuedAt}
                />
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Fecha de pago</span>
                <Input
                  name="py.paidAt"
                  onChange={(e) => patch(line.key, { paidAt: e.target.value })}
                  type="date"
                  value={line.values.paidAt}
                />
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Orden cheque</span>
                <Autocomplete
                  compact
                  onChange={(value) => patch(line.key, { checkOrder: value })}
                  options={selectOptions(ERP_CHECK_ORDER)}
                  value={line.values.checkOrder}
                />
                <input name="py.checkOrder" type="hidden" value={line.values.checkOrder} />
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Tipo cheque</span>
                <Autocomplete
                  compact
                  onChange={(value) => patch(line.key, { checkType: value })}
                  options={selectOptions(ERP_CHECK_TYPE)}
                  value={line.values.checkType}
                />
                <input name="py.checkType" type="hidden" value={line.values.checkType} />
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Modo cheque</span>
                <Autocomplete
                  compact
                  onChange={(value) => patch(line.key, { checkMode: value })}
                  options={selectOptions(ERP_CHECK_MODE)}
                  value={line.values.checkMode}
                />
                <input name="py.checkMode" type="hidden" value={line.values.checkMode} />
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Importe</span>
                <Input
                  inputMode="decimal"
                  name="py.amount"
                  onChange={(e) => patch(line.key, { amount: e.target.value })}
                  value={line.values.amount}
                />
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Estado</span>
                <Autocomplete
                  compact
                  onChange={(value) => patch(line.key, { estado: value })}
                  options={selectOptions(ERP_PAY_PURCHASE_STATUS)}
                  value={line.values.estado}
                />
                <input name="py.estado" type="hidden" value={line.values.estado} />
              </label>
              <label className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-4">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Recibo de pago</span>
                <ErpAttach compact defaultValue={line.values.attachmentUrl} name="py.attachmentUrl" />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
