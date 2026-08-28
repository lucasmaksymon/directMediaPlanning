import { Select } from "@/components/ui";
import { ERP_PAY_METHODS } from "@/lib/erp";

export function ErpPayMethodSelect({ defaultValue }: { defaultValue?: string | null }) {
  const value = defaultValue?.trim() ?? "";
  const known = ERP_PAY_METHODS.some((m) => m.value === value);
  return (
    <Select defaultValue={value} id="notes" name="notes">
      <option value="">Seleccioná</option>
      {ERP_PAY_METHODS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
      {value && !known ? <option value={value}>{value}</option> : null}
    </Select>
  );
}
