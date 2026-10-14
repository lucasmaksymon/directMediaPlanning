"use client";

import { useState } from "react";
import { Autocomplete, Input, Select, Textarea } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { ErpSettlementField } from "@/components/erp/ErpSettlementField";
import { ErpVatFields } from "@/components/erp/ErpVatFields";
import { ErpOrderOcrImport } from "@/components/erp/ocr/ErpOrderOcrImport";
import { productionDraftFromOcr, type OrderOcrPick, type ProductionOrderDraft } from "@/lib/erp-order-ocr";

type Option = { value: string; label: string };

function withPick(options: Option[], pick: OrderOcrPick | null) {
  if (!pick || options.some((o) => o.value === pick.id)) return options;
  return [{ value: pick.id, label: pick.label }, ...options];
}

export function ErpProductionOrderFormFields({
  initial,
  currentId,
  saleOrders: baseSaleOrders,
  vendors,
  estados,
}: {
  initial: ProductionOrderDraft;
  currentId?: string;
  saleOrders: Option[];
  vendors: Option[];
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
        kind="production_order"
        onResult={(result) => {
          setSaleOrders((prev) => withPick(prev, result.saleOrder));
          setDraft((prev) => productionDraftFromOcr(result, prev));
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
        <ErpField htmlFor="vendorId" label="Productor">
          <Autocomplete
            creatable
            createNoun="productor"
            defaultValue={draft.vendorId}
            id="vendorId"
            name="vendorId"
            options={vendors}
            placeholder="Buscar o crear productor…"
            required
          />
        </ErpField>
        <ErpField htmlFor="number" label="Número">
          <Input defaultValue={draft.number} id="number" name="number" required />
        </ErpField>
        <ErpField htmlFor="product" label="Producto">
          <Input defaultValue={draft.product} id="product" name="product" />
        </ErpField>
        <ErpField htmlFor="measures" label="Medidas">
          <Input defaultValue={draft.measures} id="measures" name="measures" />
        </ErpField>
        <ErpField htmlFor="printSupport" label="Soporte impresión">
          <Input defaultValue={draft.printSupport} id="printSupport" name="printSupport" />
        </ErpField>
        <ErpField htmlFor="quantity" label="Cantidad">
          <Input defaultValue={draft.quantity} id="quantity" name="quantity" />
        </ErpField>
        <ErpField htmlFor="motifs" label="Motivos">
          <Input defaultValue={draft.motifs} id="motifs" name="motifs" />
        </ErpField>
        <ErpField htmlFor="unitCost" label="Precio unitario">
          <Input defaultValue={draft.unitCost} id="unitCost" name="unitCost" />
        </ErpField>
        <ErpField htmlFor="invoiceDetail" label="Detalle FC">
          <Input defaultValue={draft.invoiceDetail} id="invoiceDetail" name="invoiceDetail" />
        </ErpField>
        <ErpField htmlFor="issuedAt" label="Fecha">
          <Input defaultValue={draft.issuedAt} id="issuedAt" name="issuedAt" type="date" />
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
        <ErpVatFields net={draft.net} netLabel="Costo neto" vat={draft.vat} vatRate={draft.vatRate} />
        <ErpField htmlFor="colorProof" label="Prueba color">
          <Input defaultValue={draft.colorProof} id="colorProof" name="colorProof" />
        </ErpField>
        <ErpField htmlFor="pickup" label="Retiro material" wide>
          <Input defaultValue={draft.pickup} id="pickup" name="pickup" />
        </ErpField>
        <ErpSettlementField cashPayment={draft.cashPayment} />
        <ErpField htmlFor="observations" label="Observaciones" wide>
          <Textarea defaultValue={draft.observations} id="observations" name="observations" rows={3} />
        </ErpField>
        <ErpField htmlFor="attachmentUrl" label="PDF de la orden" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
        <ErpLineList
          addLabel="Agregar dispositivo"
          fields={[
            { name: "element", label: "Dispositivo" },
            { name: "location", label: "Dirección" },
            { name: "quantity", label: "Cantidad", type: "number" },
            { name: "measures", label: "Medidas" },
            { name: "printSupport", label: "Soporte" },
            { name: "net", label: "Costo", type: "number" },
          ]}
          prefix="pr"
          rows={draft.items}
          title="Dispositivos"
        />
        <ErpLineList
          addLabel="Agregar destino"
          fields={[
            { name: "destination", label: "Destino" },
            { name: "quantity", label: "Cantidad", type: "number" },
          ]}
          prefix="dl"
          rows={draft.deliveries}
          title="Retiro / destinos"
        />
      </div>
    </>
  );
}
