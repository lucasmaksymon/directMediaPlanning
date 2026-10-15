"use client";

import { useState } from "react";
import { Autocomplete, Input, Select, Textarea } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { ErpPurchaseTotals } from "@/components/erp/ErpPurchaseTotals";
import { ErpSettlementField } from "@/components/erp/ErpSettlementField";
import { ErpOrderOcrImport } from "@/components/erp/ocr/ErpOrderOcrImport";
import { ERP_ADJUSTMENT_KINDS, ERP_ADJUSTMENT_LABELS } from "@/lib/erp-order-docs";
import { purchaseDraftFromOcr, type OrderOcrPick, type PurchaseOrderDraft } from "@/lib/erp-order-ocr";

type Option = { value: string; label: string };

function withPick(options: Option[], pick: OrderOcrPick | null) {
  if (!pick || options.some((o) => o.value === pick.id)) return options;
  return [{ value: pick.id, label: pick.label }, ...options];
}

export function ErpPurchaseOrderFormFields({
  initial,
  currentId,
  saleOrders: baseSaleOrders,
  vendors,
  plazaOptions,
  elementOptions,
  estados,
}: {
  initial: PurchaseOrderDraft;
  currentId?: string;
  saleOrders: Option[];
  vendors: Option[];
  plazaOptions: Option[];
  elementOptions: Option[];
  estados: readonly Option[];
}) {
  const [draft, setDraft] = useState(initial);
  const [saleOrders, setSaleOrders] = useState(baseSaleOrders);
  const [key, setKey] = useState(0);

  return (
    <>
      {currentId ? <input name="id" type="hidden" value={currentId} /> : null}
      <ErpOrderOcrImport
        currentId={currentId}
        kind="purchase_order"
        onResult={(result) => {
          setSaleOrders((prev) => withPick(prev, result.saleOrder));
          setDraft((prev) => purchaseDraftFromOcr(result, prev));
          setKey((n) => n + 1);
        }}
      />
      <div className="contents" key={key}>
        <ErpField htmlFor="saleOrderId" label="O.P. venta">
          <Autocomplete
            defaultValue={draft.saleOrderId}
            id="saleOrderId"
            name="saleOrderId"
            options={saleOrders}
            placeholder="Buscar orden…"
            required
          />
        </ErpField>
        <ErpField htmlFor="vendorId" label="Proveedor">
          <Autocomplete
            creatable
            createNoun="medio"
            defaultValue={draft.vendorId}
            id="vendorId"
            name="vendorId"
            options={vendors}
            placeholder="Buscar o crear proveedor…"
            required
          />
        </ErpField>
        <ErpField htmlFor="number" label="Número">
          <Input defaultValue={draft.number} id="number" name="number" required />
        </ErpField>
        <ErpField htmlFor="product" label="Producto">
          <Input defaultValue={draft.product} id="product" name="product" />
        </ErpField>
        <ErpField htmlFor="media" label="Medio / elemento">
          <Input defaultValue={draft.media} id="media" name="media" />
        </ErpField>
        <ErpField htmlFor="circuit" label="Circuito">
          <Input defaultValue={draft.circuit} id="circuit" name="circuit" placeholder="Igual al número si no se aclara" />
        </ErpField>
        <ErpField htmlFor="support" label="Soporte">
          <Input defaultValue={draft.support} id="support" name="support" placeholder="DIGITAL, TRADICIONAL…" />
        </ErpField>
        <ErpField htmlFor="plaza" label="Plaza">
          <Autocomplete
            creatable
            defaultValue={draft.plaza}
            id="plaza"
            name="plaza"
            options={plazaOptions}
            placeholder="Buscar o crear…"
          />
        </ErpField>
        <ErpField htmlFor="measures" label="Medidas">
          <Input defaultValue={draft.measures} id="measures" name="measures" />
        </ErpField>
        <ErpField htmlFor="issuedAt" label="Fecha">
          <Input defaultValue={draft.issuedAt} id="issuedAt" name="issuedAt" type="date" />
        </ErpField>
        <ErpField htmlFor="startsAt" label="Desde">
          <Input defaultValue={draft.startsAt} id="startsAt" name="startsAt" type="date" />
        </ErpField>
        <ErpField htmlFor="endsAt" label="Hasta">
          <Input defaultValue={draft.endsAt} id="endsAt" name="endsAt" type="date" />
        </ErpField>
        <ErpField htmlFor="days" label="Días">
          <Input defaultValue={draft.days} id="days" inputMode="numeric" name="days" />
        </ErpField>
        <ErpField htmlFor="spotCount" label="Ubicaciones (cantidad)">
          <Input defaultValue={draft.spotCount} id="spotCount" inputMode="numeric" name="spotCount" />
        </ErpField>
        <ErpField htmlFor="paidQty" label="Elementos pagos">
          <Input defaultValue={draft.paidQty} id="paidQty" name="paidQty" />
        </ErpField>
        <ErpField htmlFor="bonusQty" label="Bonificados">
          <Input defaultValue={draft.bonusQty} id="bonusQty" name="bonusQty" />
        </ErpField>
        <ErpField htmlFor="unitCost" label="Costo unitario">
          <Input defaultValue={draft.unitCost} id="unitCost" name="unitCost" />
        </ErpField>
        <ErpField htmlFor="estado" label="Estado">
          <Select defaultValue={draft.estado} id="estado" name="estado">
            {estados.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </ErpField>
        <ErpField htmlFor="costLabel" label="Leyenda del costo">
          <Input
            defaultValue={draft.costLabel}
            id="costLabel"
            name="costLabel"
            placeholder="Costo 3 días en exclusivo y 3 en loop"
          />
        </ErpField>
        <ErpField htmlFor="grossNet" label="Costo neto total (antes de ajustes)">
          <Input
            defaultValue={draft.grossNet}
            id="grossNet"
            name="grossNet"
            placeholder="Se suma del detalle si lo dejás vacío"
          />
        </ErpField>
        <ErpField htmlFor="vatRate" label="IVA %">
          <Input defaultValue={draft.vatRate} id="vatRate" name="vatRate" placeholder="0 si no lleva IVA discriminado" />
        </ErpField>
        <ErpField htmlFor="printShop" label="Imprenta">
          <Input defaultValue={draft.printShop} id="printShop" name="printShop" />
        </ErpField>
        <ErpField htmlFor="printSupport" label="Soporte impresión">
          <Input defaultValue={draft.printSupport} id="printSupport" name="printSupport" />
        </ErpField>
        <ErpSettlementField cashAmount={draft.cashAmount} cashMode={draft.cashMode} />
        <ErpField htmlFor="locations" label="Ubicaciones / circuito" wide>
          <Textarea defaultValue={draft.locations} id="locations" name="locations" rows={2} />
        </ErpField>
        <ErpField htmlFor="observations" label="Observaciones" wide>
          <Textarea defaultValue={draft.observations} id="observations" name="observations" rows={3} />
        </ErpField>
        <ErpField htmlFor="attachmentUrl" label="PDF de la orden" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
        <ErpLineList
          addLabel="Agregar línea"
          fields={[
            {
              name: "element",
              label: "Elemento",
              placeholder: "Buscar o crear…",
              options: elementOptions,
              creatable: true,
            },
            { name: "location", label: "Ubicación" },
            { name: "quantity", label: "Cantidad", type: "number" },
            { name: "days", label: "Días", type: "number" },
            { name: "measures", label: "Medidas" },
            { name: "unitCost", label: "Costo unitario", type: "number" },
            { name: "net", label: "Costo neto", type: "number" },
          ]}
          prefix="po"
          rows={draft.items}
          title="Detalle de pauta"
        />
        <ErpLineList
          addLabel="Agregar ajuste"
          allowEmpty
          fields={[
            {
              name: "label",
              label: "Concepto",
              placeholder: "Buscar o crear…",
              options: ERP_ADJUSTMENT_LABELS.map((l) => ({ value: l, label: l })),
              creatable: true,
            },
            { name: "kind", label: "Tipo", type: "select", options: [...ERP_ADJUSTMENT_KINDS] },
            { name: "percent", label: "% sobre el subtotal", type: "number" },
            { name: "amount", label: "Importe", type: "number" },
          ]}
          prefix="aj"
          rows={draft.adjustments}
          title="Ajustes del cierre"
        />
        <ErpPurchaseTotals />
      </div>
    </>
  );
}
