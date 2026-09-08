import { PaymentReturn } from "../PaymentReturn";

export default function PagoExitoPage() {
  return (
    <PaymentReturn
      description="Cuando Mercado Pago confirme el cobro, la reserva pasa a confirmada y se genera la orden en Administración."
      title="Pago aprobado"
      tone="success"
    />
  );
}
