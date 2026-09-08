import { PaymentReturn } from "../PaymentReturn";

export default function PagoErrorPage() {
  return (
    <PaymentReturn
      description="El checkout no se completó. Podés reintentar el pago desde tus solicitudes."
      title="El pago no se completó"
      tone="error"
    />
  );
}
