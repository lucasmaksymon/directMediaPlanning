import { Autocomplete } from "@/components/ui";
import { ERP_PAY_METHODS } from "@/lib/erp";

export function ErpPayMethodSelect({ defaultValue }: { defaultValue?: string | null }) {
  const value = defaultValue?.trim() ?? "";
  const known = ERP_PAY_METHODS.some((m) => m.value === value);
  return (
    <Autocomplete
      defaultValue={value}
      id="notes"
      name="notes"
      options={[
        ...ERP_PAY_METHODS.map((m) => ({ value: m.value, label: m.label })),
        ...(value && !known ? [{ value, label: value }] : []),
      ]}
      placeholder="Buscar medio…"
    />
  );
}
