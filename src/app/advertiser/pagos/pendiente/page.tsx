import { PaymentReturn } from "../PaymentReturn";

export default function PagoPendientePage() {
  return (
    <PaymentReturn
      description="Mercado Pago todavía está procesando el cobro. El espacio queda retenido hasta que se confirme o venza el hold."
      title="Pago pendiente"
      tone="warning"
    />
  );
}
