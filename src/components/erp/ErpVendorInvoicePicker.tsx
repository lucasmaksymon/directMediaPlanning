"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Autocomplete } from "@/components/ui";
import type { AutocompleteOption } from "@/components/ui/Autocomplete";
import { ErpField } from "@/components/erp/ErpField";

export type VendorInvoiceOption = AutocompleteOption & { vendorId: string };

export function ErpVendorInvoicePicker({
  vendors,
  invoices,
  defaultVendorId,
  defaultInvoiceIds,
  children,
}: {
  vendors: AutocompleteOption[];
  invoices: VendorInvoiceOption[];
  defaultVendorId?: string;
  defaultInvoiceIds: string[];
  /** Campos que van entre Proveedor y Facturas en la grilla. */
  children?: ReactNode;
}) {
  const [vendorId, setVendorId] = useState(defaultVendorId ?? "");
  const [selected, setSelected] = useState(defaultInvoiceIds);
  const anchorRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = anchorRef.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      setVendorId(defaultVendorId ?? "");
      setSelected(defaultInvoiceIds);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultInvoiceIds, defaultVendorId]);
  const vendorById = useMemo(() => new Map(invoices.map((i) => [i.value, i.vendorId])), [invoices]);
  const options = useMemo(
    () => (vendorId ? invoices.filter((i) => i.vendorId === vendorId) : invoices),
    [invoices, vendorId],
  );

  return (
    <>
      <span className="hidden" ref={anchorRef} />
      <ErpField htmlFor="vendorId" label="Proveedor">
        <Autocomplete
          id="vendorId"
          name="vendorId"
          onChange={(value) => {
            setVendorId(value);
            if (value) setSelected((prev) => prev.filter((id) => vendorById.get(id) === value));
          }}
          options={vendors}
          placeholder="Buscar proveedor…"
          required
          value={vendorId}
        />
      </ErpField>
      {children}
      <ErpField htmlFor="invoiceId" label="Facturas de compra pendientes" wide>
        <Autocomplete
          emptyLabel={vendorId ? "Sin facturas" : "Elegí un proveedor"}
          id="invoiceId"
          multiple
          name="invoiceId"
          onChange={setSelected}
          options={options}
          placeholder={vendorId ? "Buscar factura…" : "Buscar factura de cualquier proveedor…"}
          value={selected}
        />
      </ErpField>
    </>
  );
}
