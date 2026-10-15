"use client";

import { useState } from "react";
import { Autocomplete, Input, Select, Textarea } from "@/components/ui";
import { ErpAttach } from "@/components/erp/ErpAttach";
import { ErpField } from "@/components/erp/ErpField";
import { ErpLineList } from "@/components/erp/ErpLineList";
import { ErpSettlementField } from "@/components/erp/ErpSettlementField";
import { ErpVatFields } from "@/components/erp/ErpVatFields";
import { ErpOrderOcrImport } from "@/components/erp/ocr/ErpOrderOcrImport";
import { ERP_MONTHS } from "@/lib/erp";
import { saleDraftFromOcr, type SaleOrderDraft } from "@/lib/erp-order-ocr";

type Option = { value: string; label: string };

export function ErpSaleOrderFormFields({
  initial,
  currentId,
  clients,
  plazaOptions,
  elementOptions,
  estados,
}: {
  initial: SaleOrderDraft;
  currentId?: string;
  clients: Option[];
  plazaOptions: Option[];
  elementOptions: Option[];
  estados: readonly Option[];
}) {
  const [draft, setDraft] = useState(initial);
  const [key, setKey] = useState(0);

  return (
    <>
      {currentId ? <input name="id" type="hidden" value={currentId} /> : null}
      <ErpOrderOcrImport
        currentId={currentId}
        kind="sale_order"
        onResult={(result) => {
          setDraft((prev) => saleDraftFromOcr(result, prev));
          setKey((n) => n + 1);
        }}
      />
      <div className="contents" key={key}>
        <ErpField htmlFor="clientId" label="Cliente">
          <Autocomplete
            defaultValue={draft.clientId}
            id="clientId"
            name="clientId"
            options={clients}
            placeholder="Buscar cliente…"
            required
          />
        </ErpField>
        <ErpField htmlFor="number" label="Número">
          <Input defaultValue={draft.number} id="number" name="number" required />
        </ErpField>
        <ErpField htmlFor="product" label="Producto / campaña">
          <Input defaultValue={draft.product} id="product" name="product" />
        </ErpField>
        <ErpField htmlFor="plaza" label="Plaza">
          <Autocomplete
            creatable
            createNoun="plaza"
            defaultValue={draft.plaza}
            id="plaza"
            name="plaza"
            options={plazaOptions}
            placeholder="Buscar o crear… ej. Pilar (Buenos Aires)"
          />
        </ErpField>
        <ErpField htmlFor="issuedAt" label="Fecha">
          <Input defaultValue={draft.issuedAt} id="issuedAt" name="issuedAt" type="date" />
        </ErpField>
        <ErpField htmlFor="month" label="Mes">
          <Select defaultValue={draft.month} id="month" name="month">
            {ERP_MONTHS.slice(1).map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </Select>
        </ErpField>
        <ErpField htmlFor="year" label="Año">
          <Input defaultValue={draft.year} id="year" name="year" type="number" />
        </ErpField>
        <ErpField htmlFor="periodLabel" label="Período (texto)">
          <Input
            defaultValue={draft.periodLabel}
            id="periodLabel"
            name="periodLabel"
            placeholder="08 de septiembre al 08 de octubre"
          />
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
        <ErpField htmlFor="agencyFee" label="Servicio agencia %">
          <Input defaultValue={draft.agencyFee} id="agencyFee" name="agencyFee" placeholder="Del cliente si vacío" />
        </ErpField>
        <ErpVatFields
          cashAmount={draft.cashAmount}
          cashMode={draft.cashMode}
          net={draft.net}
          vat={draft.vat}
          vatRate={draft.vatRate}
        />
        <ErpSettlementField cashAmount={draft.cashAmount} cashMode={draft.cashMode} />
        <ErpField htmlFor="observations" label="Observaciones" wide>
          <Textarea defaultValue={draft.observations} id="observations" name="observations" rows={3} />
        </ErpField>
        <ErpField htmlFor="attachmentUrl" label="PDF de la orden" wide>
          <ErpAttach defaultValue={draft.attachmentUrl} name="attachmentUrl" />
        </ErpField>
        <ErpLineList
          addLabel="Agregar ítem"
          fields={[
            {
              name: "element",
              label: "Elemento",
              placeholder: "Buscar o crear…",
              options: elementOptions,
              creatable: true,
            },
            {
              name: "location",
              label: "Plaza",
              placeholder: "Buscar o crear… ej. Pilar (Buenos Aires)",
              options: plazaOptions,
              creatable: true,
            },
            { name: "plaza", label: "Ubicación", placeholder: "Av. Libertador y…" },
            { name: "quantity", label: "Cantidad", type: "number" },
            { name: "faces", label: "Caras", type: "number" },
            { name: "days", label: "Días", type: "number" },
            { name: "measures", label: "Medidas / spots" },
            { name: "unitCost", label: "Costo unitario", type: "number" },
            { name: "exhibitionNet", label: "Costo exhibición", type: "number" },
            { name: "bonusNet", label: "Bonificados", type: "number" },
            { name: "productionNet", label: "Costo producción", type: "number" },
            { name: "startsAt", label: "Desde", type: "date" },
            { name: "endsAt", label: "Hasta", type: "date" },
          ]}
          prefix="ci"
          rows={draft.items}
          title="Ítems de campaña"
        />
      </div>
    </>
  );
}
