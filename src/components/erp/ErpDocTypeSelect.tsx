import { Select } from "@/components/ui";
import { ERP_DOC_TYPES } from "@/lib/erp";

const LABELS: Record<string, string> = {
  A: "Factura A",
  B: "Factura B",
  C: "Factura C",
  E: "Factura E",
  NC: "Nota de crédito",
};

export function ErpDocTypeSelect({ defaultValue }: { defaultValue?: string | null }) {
  const value = (defaultValue ?? "A").toUpperCase();
  const extra = value && !ERP_DOC_TYPES.includes(value as (typeof ERP_DOC_TYPES)[number]);
  return (
    <Select defaultValue={value || "A"} id="docType" name="docType" required>
      {ERP_DOC_TYPES.map((t) => (
        <option key={t} value={t}>
          {LABELS[t] ?? t}
        </option>
      ))}
      {extra ? <option value={value}>{value}</option> : null}
    </Select>
  );
}
