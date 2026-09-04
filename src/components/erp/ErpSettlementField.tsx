import { Radio } from "@/components/ui";
import { ErpField } from "@/components/erp/ErpField";

export function ErpSettlementField({ cashPayment = false }: { cashPayment?: boolean }) {
  return (
    <ErpField htmlFor="cashPayment-factura" label="Condición" wide>
      <div className="flex flex-wrap items-center gap-5 pt-1">
        <label className="flex items-center gap-2 text-sm">
          <Radio
            defaultChecked={!cashPayment}
            id="cashPayment-factura"
            name="cashPayment"
            value="0"
          />
          Con factura
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Radio
            defaultChecked={cashPayment}
            id="cashPayment-efectivo"
            name="cashPayment"
            value="1"
          />
          Pago efectivo
        </label>
      </div>
    </ErpField>
  );
}
